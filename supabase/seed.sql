-- Local development fixtures.
-- Loaded by `supabase db reset` after migrations. Keep data out of migrations.

-- Demo spectator, used by the prototype until real authentication exists.
INSERT INTO profiles (id, username, points)
VALUES ('00000000-0000-0000-0000-000000000000', 'Fan_123', 1)
ON CONFLICT (id) DO NOTHING;

-- A match that is open for prediction.
INSERT INTO matches (id, home_team, away_team, status, kickoff_time)
VALUES ('11111111-1111-1111-1111-111111111111', 'Italy', 'France', 'SCHEDULED', NOW() + INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- A capacity-limited tournament for the registration path.
INSERT INTO tournaments (id, name, max_capacity, current_players)
VALUES ('22222222-2222-2222-2222-222222222222', 'Summer Cup 2026', 32, 0)
ON CONFLICT (id) DO NOTHING;