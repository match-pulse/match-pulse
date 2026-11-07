-- Authentication identity, roles and profile creation.
-- ADR-003: docs/architecture/adr/003-authorization-rls.md
--
-- This migration requires a local `supabase db reset`: profiles gains a foreign
-- key to auth.users and the old demo profile has no auth identity. The deletes
-- below are local-development cleanup, not a production data migration.

-- Remove registrations whose user is not a real auth-backed profile.
DELETE FROM public.registrations r
WHERE NOT EXISTS (
    SELECT 1
      FROM public.profiles p
      JOIN auth.users u ON u.id = p.id
     WHERE p.id = r.user_id
);

-- Remove any profile that is not backed by an auth user (including the demo
-- profile that the prototype used before authentication existed).
DELETE FROM public.profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = p.id
);

ALTER TABLE public.profiles
    ADD COLUMN role TEXT NOT NULL DEFAULT 'FAN'
        CHECK (role IN ('FAN', 'ORGANIZER')),
    ADD CONSTRAINT profiles_points_non_negative CHECK (points >= 0);

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_id_auth_users_fk
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- A registration must reference a real profile. The previous schema left
-- user_id as a bare UUID, so a caller could register a non-existent identity.
ALTER TABLE public.registrations
    ADD CONSTRAINT registrations_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Every auth user gets a profile and a starting balance. The trigger is
-- SECURITY DEFINER because auth.users is not writable by the API roles.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO public.profiles (id, username, points, role)
    VALUES (
        NEW.id,
        COALESCE(
            NULLIF(NEW.raw_user_meta_data->>'username', ''),
            'Fan_' || LEFT(NEW.id::text, 8)
        ),
        200,
        'FAN'
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
