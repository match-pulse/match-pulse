-- RLS and least-privilege grants for the MVP tables.
-- Direct writes remain revoked; mutations go through the RPCs.

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
    public.tickets,
    public.rewards,
    public.reward_redemptions,
    public.audit_events
FROM anon, authenticated;

GRANT SELECT ON public.tickets, public.rewards, public.reward_redemptions
TO authenticated;

GRANT SELECT ON public.audit_events TO authenticated;

CREATE POLICY tickets_select_own
    ON public.tickets
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY tickets_select_organizer
    ON public.tickets
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
              FROM public.tournaments t
             WHERE t.id = tournament_id
               AND t.organizer_id = auth.uid()
        )
    );

CREATE POLICY rewards_select_active
    ON public.rewards
    FOR SELECT
    TO authenticated
    USING (active = TRUE);

CREATE POLICY reward_redemptions_select_own
    ON public.reward_redemptions
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY audit_events_select_actor
    ON public.audit_events
    FOR SELECT
    TO authenticated
    USING (actor_id = auth.uid());

-- Organizers can read registrations for their own tournaments. The organizer
-- RPCs return a narrow projection; this policy supports direct read paths.
CREATE POLICY registrations_select_organizer
    ON public.registrations
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
              FROM public.tournaments t
             WHERE t.id = tournament_id
               AND t.organizer_id = auth.uid()
        )
    );

GRANT ALL ON TABLE
    public.tickets,
    public.rewards,
    public.reward_redemptions,
    public.audit_events
TO service_role;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
