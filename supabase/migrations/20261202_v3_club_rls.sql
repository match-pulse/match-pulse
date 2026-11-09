-- v3.0.0 authorization: helpers, public views, RLS and least-privilege grants.
-- ADR-007, ADR-008, ADR-010.

-- ---------------------------------------------------------------------------
-- 1. Authorization helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.require_auth()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'authentication required';
    END IF;
    RETURN v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
          FROM public.platform_admins
         WHERE profile_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.is_club_member(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
          FROM public.club_members
         WHERE club_id = p_club_id
           AND profile_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.has_club_role(p_club_id UUID, p_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
          FROM public.club_members
         WHERE club_id = p_club_id
           AND profile_id = auth.uid()
           AND role = ANY (p_roles)
    );
$$;

CREATE OR REPLACE FUNCTION public.has_entitlement(p_club_id UUID, p_feature TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
          FROM public.club_subscriptions cs
          JOIN public.plan_entitlements pe ON pe.plan_code = cs.plan_code
         WHERE cs.club_id = p_club_id
           AND cs.status = 'ACTIVE'
           AND pe.feature = p_feature
           AND pe.enabled
    );
$$;

CREATE OR REPLACE FUNCTION public.entitlement_limit(p_club_id UUID, p_feature TEXT)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT pe.limit_value
      FROM public.club_subscriptions cs
      JOIN public.plan_entitlements pe ON pe.plan_code = cs.plan_code
     WHERE cs.club_id = p_club_id
       AND cs.status = 'ACTIVE'
       AND pe.feature = p_feature
       AND pe.enabled;
$$;

CREATE OR REPLACE FUNCTION public.require_entitlement(p_club_id UUID, p_feature TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT public.has_entitlement(p_club_id, p_feature) THEN
        RAISE EXCEPTION 'plan entitlement required: %', p_feature;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.require_club_role(p_club_id UUID, p_roles TEXT[])
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := public.require_auth();
BEGIN
    IF NOT public.has_club_role(p_club_id, p_roles) THEN
        RAISE EXCEPTION 'club authorization required';
    END IF;
    RETURN v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.club_id_for_event(p_event_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT club_id FROM public.tournaments WHERE id = p_event_id;
$$;

CREATE OR REPLACE FUNCTION public.require_event_role(p_event_id UUID, p_roles TEXT[])
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := public.require_auth();
    v_club_id UUID;
BEGIN
    SELECT club_id INTO v_club_id FROM public.tournaments WHERE id = p_event_id;

    IF v_club_id IS NULL THEN
        RAISE EXCEPTION 'event has no club';
    END IF;
    IF NOT public.has_club_role(v_club_id, p_roles) THEN
        RAISE EXCEPTION 'club authorization required';
    END IF;
    RETURN v_user_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Public read views
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.public_clubs AS
SELECT id, name, slug
  FROM public.clubs;

CREATE OR REPLACE VIEW public.public_events AS
SELECT t.id,
       t.name,
       t.max_capacity,
       t.ticket_allocation,
       t.ticket_points,
       t.status,
       t.published_at,
       c.id AS club_id,
       c.name AS club_name,
       c.slug AS club_slug
  FROM public.tournaments t
  JOIN public.clubs c ON c.id = t.club_id
 WHERE t.status = 'PUBLISHED';

CREATE OR REPLACE VIEW public.public_ticket_types AS
SELECT tt.id,
       tt.event_id,
       tt.name,
       tt.sector,
       tt.price_cents,
       tt.allocation,
       tt.sold_count,
       tt.sales_start,
       tt.sales_end,
       tt.transfer_deadline,
       tt.max_per_buyer,
       tt.requires_fan_card,
       tt.transferable,
       tt.away_sector
  FROM public.ticket_types tt
  JOIN public.tournaments t ON t.id = tt.event_id
 WHERE tt.active
   AND t.status = 'PUBLISHED';

CREATE OR REPLACE VIEW public.public_matches AS
SELECT m.id,
       m.tournament_id,
       m.home_team,
       m.away_team,
       m.status,
       m.kickoff_time,
       m.home_score,
       m.away_score,
       m.prediction_enabled,
       mk.id AS market_id,
       mk.status AS market_status,
       mk.winning_outcome
  FROM public.matches m
  LEFT JOIN public.markets mk ON mk.match_id = m.id
  JOIN public.tournaments t ON t.id = m.tournament_id
 WHERE t.status = 'PUBLISHED';

CREATE OR REPLACE VIEW public.public_club_rewards AS
SELECT r.id,
       r.club_id,
       c.name AS club_name,
       r.name,
       r.cost_points,
       r.discount_percent
  FROM public.rewards r
  JOIN public.clubs c ON c.id = r.club_id
 WHERE r.active
   AND r.club_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. RLS enablement
-- ---------------------------------------------------------------------------

ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_plan_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_fan_cards ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 4. Grants for new tables and views
-- ---------------------------------------------------------------------------

REVOKE ALL ON TABLE
    public.clubs,
    public.club_members,
    public.club_invites,
    public.platform_admins,
    public.plans,
    public.plan_entitlements,
    public.club_subscriptions,
    public.club_plan_requests,
    public.ticket_types,
    public.ticket_orders,
    public.ticket_transfers,
    public.club_fan_cards
FROM anon, authenticated;

GRANT SELECT ON
    public.clubs,
    public.club_members,
    public.club_invites,
    public.platform_admins,
    public.plans,
    public.plan_entitlements,
    public.club_subscriptions,
    public.club_plan_requests,
    public.ticket_types,
    public.ticket_orders,
    public.ticket_transfers,
    public.club_fan_cards
TO authenticated;

GRANT SELECT ON public.plans, public.plan_entitlements TO anon;

GRANT SELECT ON
    public.public_clubs,
    public.public_events,
    public.public_ticket_types,
    public.public_matches,
    public.public_club_rewards
TO anon, authenticated;

GRANT ALL ON TABLE
    public.clubs,
    public.club_members,
    public.club_invites,
    public.platform_admins,
    public.plans,
    public.plan_entitlements,
    public.club_subscriptions,
    public.club_plan_requests,
    public.ticket_types,
    public.ticket_orders,
    public.ticket_transfers,
    public.club_fan_cards
TO service_role;

-- ---------------------------------------------------------------------------
-- 5. Policies: new tables
-- ---------------------------------------------------------------------------

CREATE POLICY clubs_select_member
    ON public.clubs
    FOR SELECT
    TO authenticated
    USING (public.is_club_member(id) OR public.is_platform_admin());

CREATE POLICY club_members_select_club
    ON public.club_members
    FOR SELECT
    TO authenticated
    USING (public.is_club_member(club_id) OR public.is_platform_admin());

CREATE POLICY club_invites_select_managers
    ON public.club_invites
    FOR SELECT
    TO authenticated
    USING (
        public.has_club_role(club_id, ARRAY['OWNER', 'ADMIN'])
        OR public.is_platform_admin()
    );

CREATE POLICY platform_admins_select_own
    ON public.platform_admins
    FOR SELECT
    TO authenticated
    USING (profile_id = auth.uid() OR public.is_platform_admin());

CREATE POLICY plans_select_public
    ON public.plans
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY plan_entitlements_select_public
    ON public.plan_entitlements
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY club_subscriptions_select_member
    ON public.club_subscriptions
    FOR SELECT
    TO authenticated
    USING (public.is_club_member(club_id) OR public.is_platform_admin());

CREATE POLICY club_plan_requests_select_managers
    ON public.club_plan_requests
    FOR SELECT
    TO authenticated
    USING (
        public.has_club_role(club_id, ARRAY['OWNER', 'ADMIN'])
        OR public.is_platform_admin()
    );

CREATE POLICY ticket_types_select_public_or_member
    ON public.ticket_types
    FOR SELECT
    TO authenticated
    USING (
        public.is_platform_admin()
        OR EXISTS (
            SELECT 1
              FROM public.tournaments t
             WHERE t.id = ticket_types.event_id
               AND (
                   public.is_club_member(t.club_id)
                   OR (t.status = 'PUBLISHED' AND ticket_types.active)
               )
        )
    );

CREATE POLICY ticket_orders_select_buyer_or_staff
    ON public.ticket_orders
    FOR SELECT
    TO authenticated
    USING (
        buyer_id = auth.uid()
        OR EXISTS (
            SELECT 1
              FROM public.tournaments t
             WHERE t.id = ticket_orders.event_id
               AND public.has_club_role(t.club_id, ARRAY['OWNER', 'ADMIN', 'STAFF'])
        )
    );

CREATE POLICY ticket_transfers_select_owner_or_staff
    ON public.ticket_transfers
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
              FROM public.tickets tk
             WHERE tk.id = ticket_transfers.ticket_id
               AND (tk.user_id = auth.uid() OR tk.buyer_id = auth.uid())
        )
        OR EXISTS (
            SELECT 1
              FROM public.tickets tk
              JOIN public.tournaments t ON t.id = tk.tournament_id
             WHERE tk.id = ticket_transfers.ticket_id
               AND public.has_club_role(t.club_id, ARRAY['OWNER', 'ADMIN', 'STAFF'])
        )
    );

CREATE POLICY club_fan_cards_select_own_or_staff
    ON public.club_fan_cards
    FOR SELECT
    TO authenticated
    USING (
        profile_id = auth.uid()
        OR public.has_club_role(club_id, ARRAY['OWNER', 'ADMIN', 'STAFF'])
        OR public.is_platform_admin()
    );

-- ---------------------------------------------------------------------------
-- 6. Policies: existing tables
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS tournaments_select_public ON public.tournaments;

CREATE POLICY tournaments_select_published
    ON public.tournaments
    FOR SELECT
    TO anon, authenticated
    USING (status = 'PUBLISHED');

CREATE POLICY tournaments_select_club_member
    ON public.tournaments
    FOR SELECT
    TO authenticated
    USING (public.is_club_member(club_id));

CREATE POLICY tournaments_select_platform_admin
    ON public.tournaments
    FOR SELECT
    TO authenticated
    USING (public.is_platform_admin());

DROP POLICY IF EXISTS matches_select_public ON public.matches;

CREATE POLICY matches_select_public_or_member
    ON public.matches
    FOR SELECT
    TO anon, authenticated
    USING (
        tournament_id IS NULL
        OR EXISTS (
            SELECT 1
              FROM public.tournaments t
             WHERE t.id = matches.tournament_id
               AND (
                   t.status = 'PUBLISHED'
                   OR public.is_club_member(t.club_id)
                   OR public.is_platform_admin()
               )
        )
    );

DROP POLICY IF EXISTS markets_select_public ON public.markets;

CREATE POLICY markets_select_public_or_member
    ON public.markets
    FOR SELECT
    TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1
              FROM public.matches mt
              LEFT JOIN public.tournaments t ON t.id = mt.tournament_id
             WHERE mt.id = markets.match_id
               AND (
                   t.id IS NULL
                   OR t.status = 'PUBLISHED'
                   OR public.is_club_member(t.club_id)
                   OR public.is_platform_admin()
               )
        )
    );

CREATE POLICY tickets_select_club_staff
    ON public.tickets
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
              FROM public.tournaments t
             WHERE t.id = tickets.tournament_id
               AND public.has_club_role(t.club_id, ARRAY['OWNER', 'ADMIN', 'STAFF'])
        )
    );

CREATE POLICY registrations_select_club_staff
    ON public.registrations
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
              FROM public.tournaments t
             WHERE t.id = registrations.tournament_id
               AND public.has_club_role(t.club_id, ARRAY['OWNER', 'ADMIN', 'STAFF'])
        )
    );

CREATE POLICY rewards_select_club_member
    ON public.rewards
    FOR SELECT
    TO authenticated
    USING (club_id IS NOT NULL AND public.is_club_member(club_id));

CREATE POLICY reward_redemptions_select_club_staff
    ON public.reward_redemptions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
              FROM public.rewards r
             WHERE r.id = reward_redemptions.reward_id
               AND r.club_id IS NOT NULL
               AND public.has_club_role(r.club_id, ARRAY['OWNER', 'ADMIN', 'STAFF'])
        )
    );

CREATE POLICY audit_events_select_club
    ON public.audit_events
    FOR SELECT
    TO authenticated
    USING (
        club_id IS NOT NULL
        AND (public.is_club_member(club_id) OR public.is_platform_admin())
    );

-- ---------------------------------------------------------------------------
-- 7. Function grants
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.require_auth() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_club_member(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_club_role(UUID, TEXT[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_entitlement(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.entitlement_limit(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.require_entitlement(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.require_club_role(UUID, TEXT[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.club_id_for_event(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.require_event_role(UUID, TEXT[]) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_club_member(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_club_role(UUID, TEXT[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_entitlement(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.entitlement_limit(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.require_auth() TO authenticated;
GRANT EXECUTE ON FUNCTION public.require_entitlement(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.require_club_role(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_id_for_event(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.require_event_role(UUID, TEXT[]) TO authenticated;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
