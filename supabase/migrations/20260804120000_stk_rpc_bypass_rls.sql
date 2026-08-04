-- STK helper RPC functions — SECURITY DEFINER so Vercel serverless functions
-- can update transactions without needing the service_role key in env.

-- ── 1. Called by Vercel initiate-stk after a successful STK push ──────────
-- Stores the CheckoutRequestID so the callback can match it later.
-- Only works on pending/processing rows so it can't be abused to overwrite
-- a completed transaction.
CREATE OR REPLACE FUNCTION public.set_stk_checkout_id(p_tx_id uuid, p_checkout_id text)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.transactions
  SET stk_checkout_id = p_checkout_id,
      status          = 'processing'
  WHERE id              = p_tx_id
    AND status         IN ('pending', 'processing')
    AND stk_checkout_id IS NULL
$$;
REVOKE ALL ON FUNCTION public.set_stk_checkout_id(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_stk_checkout_id(uuid, text) TO anon, authenticated, service_role;

-- ── 2. Called by Vercel stk-callback when Safaricom posts the result ──────
-- Atomically updates the transaction and returns the full row so the
-- callback can send the confirmation SMS without a second DB round-trip.
CREATE OR REPLACE FUNCTION public.process_stk_callback(
  p_checkout_id text,
  p_result_code integer,
  p_result_desc text    DEFAULT '',
  p_mpesa_ref   text    DEFAULT NULL
)
RETURNS SETOF public.transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_result_code = 0 THEN
    UPDATE public.transactions
    SET status          = 'completed',
        mpesa_reference = NULLIF(p_mpesa_ref, ''),
        failure_reason  = NULL,
        updated_at      = NOW()
    WHERE stk_checkout_id = p_checkout_id
      AND status IN ('pending', 'processing');
  ELSE
    UPDATE public.transactions
    SET status         = 'failed',
        failure_reason = NULLIF(p_result_desc, ''),
        updated_at     = NOW()
    WHERE stk_checkout_id = p_checkout_id
      AND status IN ('pending', 'processing');
  END IF;

  RETURN QUERY
    SELECT * FROM public.transactions
    WHERE stk_checkout_id = p_checkout_id
    LIMIT 1;
END;
$$;
REVOKE ALL ON FUNCTION public.process_stk_callback(text, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_stk_callback(text, integer, text, text) TO anon, authenticated, service_role;
