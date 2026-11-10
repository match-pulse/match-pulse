-- v3.1.0 audit remediation: result-bound market lifecycle.
-- FND-011: entries stop when the match is FINISHED; resolution requires a
-- finished match and the outcome derived from the final score.
-- FND-014: disabling predictions blocks BUY trades only; exits remain available.
--
-- The guards are triggers so they apply to every mutation path, including
-- service-role maintenance, not only the current RPC wrappers.

-- Exits are never gated by the prediction-enabled flag.
CREATE OR REPLACE FUNCTION public.enforce_prediction_enabled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_enabled BOOLEAN;
BEGIN
    IF NEW.kind <> 'BUY' THEN
        RETURN NEW;
    END IF;

    SELECT mt.prediction_enabled
      INTO v_enabled
      FROM public.markets m
      JOIN public.matches mt ON mt.id = m.match_id
     WHERE m.id = NEW.market_id;

    IF NOT COALESCE(v_enabled, FALSE) THEN
        RAISE EXCEPTION 'predictions are not enabled for this event';
    END IF;

    RETURN NEW;
END;
$$;

-- New entries are refused once the match is finished or the event is cancelled.
-- SELL trades are deliberately exempt so holders can exit while the market is open.
CREATE OR REPLACE FUNCTION public.enforce_market_window()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_match_status TEXT;
    v_event_status TEXT;
BEGIN
    IF NEW.kind <> 'BUY' THEN
        RETURN NEW;
    END IF;

    SELECT mt.status, t.status
      INTO v_match_status, v_event_status
      FROM public.markets m
      JOIN public.matches mt ON mt.id = m.match_id
      LEFT JOIN public.tournaments t ON t.id = mt.tournament_id
     WHERE m.id = NEW.market_id;

    IF v_match_status = 'FINISHED' THEN
        RAISE EXCEPTION 'market is closed: match is finished';
    END IF;
    IF v_event_status = 'CANCELLED' THEN
        RAISE EXCEPTION 'market is closed: event is cancelled';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS market_trades_market_window ON public.market_trades;
CREATE TRIGGER market_trades_market_window
    BEFORE INSERT ON public.market_trades
    FOR EACH ROW EXECUTE FUNCTION public.enforce_market_window();

-- Resolution is only valid after full time and only for the score-derived winner.
CREATE OR REPLACE FUNCTION public.enforce_market_resolution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_match_status TEXT;
    v_home_score INT;
    v_away_score INT;
    v_expected_winner TEXT;
BEGIN
    IF NEW.status <> 'RESOLVED' OR OLD.status = 'RESOLVED' THEN
        RETURN NEW;
    END IF;

    SELECT mt.status, mt.home_score, mt.away_score
      INTO v_match_status, v_home_score, v_away_score
      FROM public.matches mt
     WHERE mt.id = NEW.match_id;

    IF v_match_status IS DISTINCT FROM 'FINISHED' THEN
        RAISE EXCEPTION 'match is not finished';
    END IF;

    v_expected_winner := CASE
        WHEN v_home_score > v_away_score THEN 'HOME'
        WHEN v_home_score < v_away_score THEN 'AWAY'
        ELSE 'DRAW'
    END;

    IF NEW.winning_outcome IS DISTINCT FROM v_expected_winner THEN
        RAISE EXCEPTION 'winning outcome does not match the final score';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS markets_result_binding ON public.markets;
CREATE TRIGGER markets_result_binding
    BEFORE UPDATE ON public.markets
    FOR EACH ROW EXECUTE FUNCTION public.enforce_market_resolution();

-- Match edits cannot create an early FINISHED state or change a score after
-- the market has been resolved. Enabling predictions on a closed event is refused.
CREATE OR REPLACE FUNCTION public.enforce_match_result_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_event_status TEXT;
BEGIN
    IF NEW.status = 'FINISHED' AND NOW() < NEW.kickoff_time THEN
        RAISE EXCEPTION 'cannot finish a match before kickoff';
    END IF;

    IF (NEW.home_score IS DISTINCT FROM OLD.home_score
        OR NEW.away_score IS DISTINCT FROM OLD.away_score)
       AND EXISTS (
           SELECT 1
             FROM public.markets m
            WHERE m.match_id = NEW.id
              AND m.status = 'RESOLVED'
       ) THEN
        RAISE EXCEPTION 'cannot change a score after market resolution';
    END IF;

    IF NEW.prediction_enabled AND NOT OLD.prediction_enabled THEN
        SELECT t.status
          INTO v_event_status
          FROM public.tournaments t
         WHERE t.id = NEW.tournament_id;

        IF NEW.status = 'FINISHED' OR v_event_status IN ('FINISHED', 'CANCELLED') THEN
            RAISE EXCEPTION 'cannot enable predictions on a closed event';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS matches_result_integrity ON public.matches;
CREATE TRIGGER matches_result_integrity
    BEFORE UPDATE ON public.matches
    FOR EACH ROW EXECUTE FUNCTION public.enforce_match_result_integrity();
