-- Seed a dummy user profile with 1 point
INSERT INTO profiles (id, username, points) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Fan_123', 1)
ON CONFLICT (id) DO NOTHING;

-- Seed a test match
INSERT INTO matches (id, home_team, away_team, status, kickoff_time) 
VALUES ('11111111-1111-1111-1111-111111111111', 'Italy', 'France', 'SCHEDULED', NOW() + INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;