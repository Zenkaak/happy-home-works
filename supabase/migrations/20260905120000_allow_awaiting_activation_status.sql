-- The admin panel and activation flow support this status, but the original
-- transactions check constraint did not include it.
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_status_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_status_check
  CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'awaiting_activation'));