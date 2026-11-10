-- v3.1.0 audit remediation: idempotent reward redemption.
-- FND-013: a retry or double submit with the same request key must replay the
-- recorded redemption, not debit points twice.

ALTER TABLE public.reward_redemptions
    ADD COLUMN request_id UUID NOT NULL DEFAULT gen_random_uuid(),
    ADD COLUMN points_after INT;

CREATE UNIQUE INDEX reward_redemptions_user_request_unique
    ON public.reward_redemptions (user_id, request_id);

DROP FUNCTION IF EXISTS public.redeem_reward(UUID);

CREATE OR REPLACE FUNCTION public.redeem_reward(
    p_reward_id UUID,
    p_request_id UUID
) RETURNS TABLE (code TEXT, points_after INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_cost INT;
    v_active BOOLEAN;
    v_club_id UUID;
    v_points INT;
    v_after INT;
    v_code TEXT;
    v_existing_code TEXT;
    v_existing_reward UUID;
    v_existing_spent INT;
    v_existing_after INT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'authentication required';
    END IF;
    IF p_request_id IS NULL THEN
        RAISE EXCEPTION 'request id required';
    END IF;

    SELECT cost_points, active, club_id
      INTO v_cost, v_active, v_club_id
      FROM public.rewards
     WHERE id = p_reward_id
       FOR UPDATE;

    IF NOT FOUND OR NOT v_active THEN
        RAISE EXCEPTION 'reward not available';
    END IF;

    SELECT points INTO v_points
      FROM public.profiles
     WHERE id = v_user_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'profile not found';
    END IF;

    -- Replay before the current eligibility/balance checks: a retry must return
    -- the recorded redemption even if the fan has since spent points or changed
    -- their ticket state.
    SELECT r.code, r.reward_id, r.points_spent, r.points_after
      INTO v_existing_code, v_existing_reward, v_existing_spent, v_existing_after
      FROM public.reward_redemptions r
     WHERE r.user_id = v_user_id
       AND r.request_id = p_request_id;

    IF FOUND THEN
        IF v_existing_reward <> p_reward_id OR v_existing_spent <> v_cost THEN
            RAISE EXCEPTION 'request id reused with a different payload';
        END IF;

        code := v_existing_code;
        points_after := COALESCE(v_existing_after, v_points);
        RETURN NEXT;
        RETURN;
    END IF;

    IF v_club_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
          FROM public.tickets t
          JOIN public.tournaments tr ON tr.id = t.tournament_id
         WHERE tr.club_id = v_club_id
           AND (t.buyer_id = v_user_id OR t.user_id = v_user_id)
    ) THEN
        RAISE EXCEPTION 'ticket required for this club reward';
    END IF;

    IF v_points < v_cost THEN
        RAISE EXCEPTION 'insufficient points';
    END IF;

    v_code := 'MP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

    UPDATE public.profiles
       SET points = points - v_cost
     WHERE id = v_user_id
    RETURNING points INTO v_after;

    INSERT INTO public.reward_redemptions (
        user_id, reward_id, points_spent, code, request_id, points_after
    ) VALUES (
        v_user_id, p_reward_id, v_cost, v_code, p_request_id, v_after
    );

    INSERT INTO public.audit_events (actor_id, club_id, action, entity_type, entity_id, metadata)
    VALUES (v_user_id, v_club_id, 'reward.redeem', 'reward', p_reward_id,
            jsonb_build_object('code', v_code, 'points', v_cost));

    code := v_code;
    points_after := v_after;
    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_reward(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_reward(UUID, UUID) TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
