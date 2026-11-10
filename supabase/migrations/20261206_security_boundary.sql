-- v3.1.0 audit remediation: close the authenticated security boundary.
-- FND-009: anonymous sessions are disabled in supabase/config.toml.
-- FND-010: current club membership, not legacy organizer_id, controls attendee data.
-- FND-022: platform-admin direct reads of invitation/fan-card data are removed.
--
-- The legacy organizer pages use SECURITY DEFINER RPCs with ownership checks;
-- they do not depend on these direct table policies.

-- Attendee tickets: remove the v2 organizer policy. Current OWNER/ADMIN/STAFF
-- access is provided by tickets_select_club_staff; buyers keep tickets_select_own.
DROP POLICY IF EXISTS tickets_select_organizer ON public.tickets;

-- Registrations: remove the v2 organizer policy. Current club staff access is
-- provided by registrations_select_club_staff; fans keep their own rows.
DROP POLICY IF EXISTS registrations_select_organizer ON public.registrations;

-- Invitations: only current OWNER/ADMIN members may read them. Platform-admin
-- support access must use an audited RPC if it is introduced later.
DROP POLICY IF EXISTS club_invites_select_managers ON public.club_invites;
CREATE POLICY club_invites_select_managers
    ON public.club_invites
    FOR SELECT
    TO authenticated
    USING (public.has_club_role(club_id, ARRAY['OWNER', 'ADMIN']));

-- Fan cards: fans may read their own card; current club staff may read the
-- club's cards. Platform-admin support access is not a direct table read.
DROP POLICY IF EXISTS club_fan_cards_select_own_or_staff ON public.club_fan_cards;
CREATE POLICY club_fan_cards_select_own_or_staff
    ON public.club_fan_cards
    FOR SELECT
    TO authenticated
    USING (
        profile_id = auth.uid()
        OR public.has_club_role(club_id, ARRAY['OWNER', 'ADMIN', 'STAFF'])
    );
