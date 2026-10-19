-- Create Matches table
CREATE TABLE matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'LIVE', 'FINISHED')),
    kickoff_time TIMESTAMPTZ NOT NULL
);

-- Create Predictions table
CREATE TABLE predictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    predicted_home_score INT NOT NULL CHECK (predicted_home_score >= 0),
    predicted_away_score INT NOT NULL CHECK (predicted_away_score >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Invariant 2: Max 1 prediction per user per fixture
    UNIQUE(user_id, match_id) 
);

-- Atomic RPC for duplicate prediction prevention (the UNIQUE constraint below).
-- NOTE: kickoff is NOT enforced here — the function checks match status only.
-- The kickoff deadline was withdrawn as a product rule on 2026-10-19 in favour
-- of a live prediction market whose window opens at kickoff; see ADR-002.
CREATE OR REPLACE FUNCTION submit_prediction(
    p_user_id UUID, 
    p_match_id UUID, 
    p_home_score INT, 
    p_away_score INT
) RETURNS boolean AS $$
DECLARE
    affected_rows INT;
BEGIN
    -- Atomic Compare-and-Set:
    -- Insert ONLY IF the match is currently SCHEDULED
    INSERT INTO predictions (user_id, match_id, predicted_home_score, predicted_away_score)
    SELECT p_user_id, p_match_id, p_home_score, p_away_score
    WHERE EXISTS (
        SELECT 1 FROM matches WHERE id = p_match_id AND status = 'SCHEDULED'
    )
    -- If the user double-clicks, ignore the second insert
    ON CONFLICT (user_id, match_id) DO NOTHING;
    
    -- Check how many rows were actually inserted (1 = success, 0 = rejected)
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN affected_rows > 0;
END;
$$ LANGUAGE plpgsql;


-- Create Profiles table for User Points
CREATE TABLE profiles (
    id UUID PRIMARY KEY,
    username TEXT NOT NULL,
    points INT NOT NULL DEFAULT 1
);

-- Create Tournaments table
CREATE TABLE tournaments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    max_capacity INT NOT NULL,
    current_players INT DEFAULT 0
);

-- Create Registrations table
CREATE TABLE registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Registrations for a capacity-limited tournament.
-- The register_for_tournament function that writes to these tables is defined
-- in 20261019_registration_integrity.sql, together with the constraints that
-- make the capacity and uniqueness rules enforceable.