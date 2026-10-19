-- Domain integrity for tournament registration.
--
-- This migration makes the rules that the documentation claimed but the schema
-- did not enforce. See docs/methodology/checkpoint-A/02-invariants.md.

-- INV-02: a participant cannot register for the same tournament twice.
ALTER TABLE registrations
    ADD CONSTRAINT registrations_tournament_user_unique UNIQUE (tournament_id, user_id);

-- A registration must point at a tournament, otherwise the uniqueness rule above
-- is silently bypassed (NULLs are distinct in a unique index).
ALTER TABLE registrations
    ALTER COLUMN tournament_id SET NOT NULL;

-- A prediction must point at a match.
ALTER TABLE predictions
    ALTER COLUMN match_id SET NOT NULL;

-- INV-01: the stored player count must always be a meaningful number that the
-- tournament actually has room for. These make overbooking impossible to
-- represent, not merely improbable.
ALTER TABLE tournaments
    ADD CONSTRAINT tournaments_max_capacity_positive CHECK (max_capacity > 0),
    ADD CONSTRAINT tournaments_current_players_non_negative CHECK (current_players >= 0),
    ADD CONSTRAINT tournaments_current_players_within_capacity CHECK (current_players <= max_capacity);

-- INV-01 + INV-02 together.
--
-- The capacity guard is defined here rather than in 20261018_init.sql because
-- it is only correct once the constraints above exist.
--
-- The implementation increments the counter and then inserts, holding a
-- pessimistic lock on the tournament row first so that the capacity check, the
-- insert and the increment all happen under one lock. A duplicate submission
-- returns false rather than raising, and consumes no second place.
CREATE OR REPLACE FUNCTION register_for_tournament(
    p_tournament_id UUID,
    p_user_id UUID
) RETURNS boolean AS $$
DECLARE
    v_current_players INT;
    v_max_capacity INT;
    v_registration_id UUID;
BEGIN
    -- Lock the tournament row for the remainder of this transaction.
    SELECT current_players, max_capacity
      INTO v_current_players, v_max_capacity
      FROM tournaments
     WHERE id = p_tournament_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    IF v_current_players >= v_max_capacity THEN
        RETURN false;
    END IF;

    -- A subtransaction: a duplicate rolls back the insert without aborting the
    -- call, so the caller receives a refusal instead of an exception.
    BEGIN
        INSERT INTO registrations (tournament_id, user_id)
        VALUES (p_tournament_id, p_user_id)
        RETURNING id INTO v_registration_id;
    EXCEPTION WHEN unique_violation THEN
        RETURN false;
    END;

    UPDATE tournaments
       SET current_players = current_players + 1
     WHERE id = p_tournament_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql;