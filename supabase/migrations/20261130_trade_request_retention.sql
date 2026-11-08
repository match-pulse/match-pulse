-- Request-key retention: completed idempotency rows are maintenance data, not
-- business records. The cleanup is service-role-only; the application runtime
-- never calls it.

CREATE INDEX IF NOT EXISTS trade_requests_completed_at_idx
    ON public.trade_requests (completed_at)
    WHERE completed_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.cleanup_completed_trade_requests(
    p_retention INTERVAL DEFAULT INTERVAL '30 days'
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_deleted INT;
BEGIN
    IF p_retention IS NULL OR p_retention < INTERVAL '1 day' THEN
        RAISE EXCEPTION 'retention must be at least one day';
    END IF;

    DELETE FROM public.trade_requests
     WHERE status = 'COMPLETED'
       AND completed_at IS NOT NULL
       AND completed_at < NOW() - p_retention;

    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_completed_trade_requests(INTERVAL)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.cleanup_completed_trade_requests(INTERVAL)
TO service_role;
