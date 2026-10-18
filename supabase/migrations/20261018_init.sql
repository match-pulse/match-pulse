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