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

-- Atomic RPC for the Kickoff Lock (Invariant 1)
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

-- Insert our dummy test user with 1 point
INSERT INTO profiles (id, username, points) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Fan_123', 1);

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

-- Atomic RPC to register a user (Prevents overbooking)
CREATE OR REPLACE FUNCTION register_for_tournament(
    p_tournament_id UUID,
    p_user_id UUID
) RETURNS boolean AS $$
DECLARE
    affected_rows INT;
BEGIN
    -- Atomic check-and-increment
    UPDATE tournaments
    SET current_players = current_players + 1
    WHERE id = p_tournament_id AND current_players < max_capacity;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    IF affected_rows = 1 THEN
        INSERT INTO registrations (tournament_id, user_id)
        VALUES (p_tournament_id, p_user_id);
        RETURN true;
    ELSE
        RETURN false;
    END IF;
END;
$$ LANGUAGE plpgsql;