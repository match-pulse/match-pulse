-- Local development fixtures.
-- Loaded by `supabase db reset` after migrations. Keep data out of migrations.

-- Profiles are created by the auth trigger when a user signs in. Do not insert
-- a profile here: profiles.id references auth.users(id), and a profile without
-- an auth identity cannot sign in or pass RLS.

-- A live match: the market opens at kickoff and stays open until resolution.
INSERT INTO matches (id, home_team, away_team, status, kickoff_time)
VALUES ('11111111-1111-1111-1111-111111111111', 'Italy', 'France', 'LIVE', NOW() - INTERVAL '1 hour')
ON CONFLICT (id) DO NOTHING;

-- The demo market the home page opens. Liquidity parameter b = 100.
INSERT INTO markets (id, match_id, b)
VALUES ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 100)
ON CONFLICT (id) DO NOTHING;

-- A capacity-limited tournament for the registration path.
INSERT INTO tournaments (id, name, max_capacity, current_players)
VALUES ('22222222-2222-2222-2222-222222222222', 'Summer Cup 2026', 32, 0)
ON CONFLICT (id) DO NOTHING;
