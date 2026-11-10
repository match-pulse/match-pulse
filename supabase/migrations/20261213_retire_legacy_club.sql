-- Retire the legacy v2 CLUB analytics surface (FND-023 / issue #188).
--
-- The v3 club analytics use club_prediction_insights and the club-scoped
-- export-v3 route. The legacy global CLUB role, page, export and RPCs are
-- removed so no self-service role can read cross-club aggregates.

-- Convert existing legacy fixtures to FAN before tightening the constraint.
UPDATE public.profiles
   SET role = 'FAN'
 WHERE role = 'CLUB';

ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('FAN', 'ORGANIZER'));

DROP FUNCTION IF EXISTS public.club_analytics_summary(UUID, UUID);
DROP FUNCTION IF EXISTS public.club_analytics_timeseries(UUID, INT);
DROP FUNCTION IF EXISTS public.record_club_export(TEXT, JSONB);
