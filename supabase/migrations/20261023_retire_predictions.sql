-- Retire the fixed-score prediction feature (owner decision D3, ADR-002).
-- The live market engine in 20261021_market_core.sql replaces it.

DROP FUNCTION IF EXISTS public.submit_prediction(UUID, UUID, INT, INT);
DROP TABLE IF EXISTS public.predictions;
