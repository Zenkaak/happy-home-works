-- Allow the backend (anon role used by Vercel functions) to insert SMS logs.
-- SELECT remains blocked ("SMS logs not public" policy), so no data leaks.
CREATE POLICY "backend_insert_sms_logs"
  ON public.sms_logs
  FOR INSERT
  WITH CHECK (true);
