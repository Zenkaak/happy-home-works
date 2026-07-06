-- ============================================================================
-- Security hardening + performance fixes
-- ============================================================================

-- 1. Remove dangerous public DELETE on transactions
--    (no legitimate client-side use case; service_role bypasses RLS anyway)
DROP POLICY IF EXISTS "Transactions deletable" ON public.transactions;

-- 2. Replace blanket UPDATE with a restricted policy:
--    Anon can only touch a transaction that is still in "processing" state
--    AND can only keep it in "processing" (i.e. only stk_checkout_id writes).
--    service_role (used by stk-callback + edge functions) bypasses RLS entirely.
DROP POLICY IF EXISTS "Transactions updatable" ON public.transactions;
CREATE POLICY "Transactions updatable - processing only"
  ON public.transactions FOR UPDATE
  USING  (status = 'processing')
  WITH CHECK (status = 'processing');

-- 3. Remove public DELETE/UPDATE on vendors (anyone could approve themselves or
--    change their commission_rate). INSERT kept for new vendor registration.
--    Writes (approve, suspend, update commission) must go through service_role.
DROP POLICY IF EXISTS "Vendors updatable" ON public.vendors;

-- 4. Remove public DELETE/UPDATE on withdrawals.
--    Approving a withdrawal must go through service_role (edge function / server).
DROP POLICY IF EXISTS "Withdrawals updatable" ON public.withdrawals;

-- 5. Performance: add index on stk_checkout_id so the callback lookup is O(log n)
--    instead of a full table scan on every payment.
CREATE INDEX IF NOT EXISTS idx_transactions_stk_checkout_id
  ON public.transactions(stk_checkout_id)
  WHERE stk_checkout_id IS NOT NULL;
