-- ============ VENDORS ============
DROP POLICY IF EXISTS "Vendors publicly readable" ON public.vendors;
DROP POLICY IF EXISTS "Vendors updatable" ON public.vendors;
DROP POLICY IF EXISTS "Vendors insertable" ON public.vendors;
REVOKE ALL ON public.vendors FROM anon, authenticated;
GRANT ALL ON public.vendors TO service_role;

CREATE OR REPLACE FUNCTION public.vendor_leaderboard()
RETURNS TABLE(name text, total_sales integer, total_revenue numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT v.name, v.total_sales, v.total_revenue
  FROM public.vendors v
  WHERE v.status = 'approved' AND v.total_sales > 0
  ORDER BY v.total_revenue DESC
  LIMIT 10
$$;
REVOKE ALL ON FUNCTION public.vendor_leaderboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vendor_leaderboard() TO anon, authenticated, service_role;

-- ============ WITHDRAWALS ============
DROP POLICY IF EXISTS "Withdrawals publicly readable" ON public.withdrawals;
DROP POLICY IF EXISTS "Withdrawals insertable" ON public.withdrawals;
DROP POLICY IF EXISTS "Withdrawals updatable" ON public.withdrawals;
REVOKE ALL ON public.withdrawals FROM anon, authenticated;
GRANT ALL ON public.withdrawals TO service_role;

-- ============ MANUAL PAYMENTS ============
DROP POLICY IF EXISTS "Manual payments readable" ON public.manual_payments;
DROP POLICY IF EXISTS "Manual payments updatable" ON public.manual_payments;
DROP POLICY IF EXISTS "Manual payments insertable" ON public.manual_payments;
REVOKE ALL ON public.manual_payments FROM anon, authenticated;
GRANT INSERT ON public.manual_payments TO anon, authenticated;
GRANT ALL ON public.manual_payments TO service_role;
CREATE POLICY "Customers can submit manual payments"
ON public.manual_payments FOR INSERT TO anon, authenticated
WITH CHECK (status = 'pending' AND verified_at IS NULL AND admin_notes IS NULL);

-- ============ TRANSACTIONS ============
DROP POLICY IF EXISTS "Transactions publicly readable" ON public.transactions;
DROP POLICY IF EXISTS "Transactions updatable" ON public.transactions;
DROP POLICY IF EXISTS "Transactions deletable" ON public.transactions;
DROP POLICY IF EXISTS "Transactions insertable" ON public.transactions;
REVOKE ALL ON public.transactions FROM anon, authenticated;
GRANT INSERT ON public.transactions TO anon, authenticated;
GRANT ALL ON public.transactions TO service_role;
CREATE POLICY "Customers can create pending orders"
ON public.transactions FOR INSERT TO anon, authenticated
WITH CHECK (
  status IN ('pending', 'processing')
  AND kplc_token IS NULL
  AND mpesa_reference IS NULL
  AND amount > 0
  AND amount <= 150000
);

-- Secure single-order lookup (order id is an unguessable uuid)
CREATE OR REPLACE FUNCTION public.get_order(p_id uuid)
RETURNS SETOF public.transactions
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.transactions WHERE id = p_id LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.get_order(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order(uuid) TO anon, authenticated, service_role;

-- Masked public activity feed
CREATE OR REPLACE FUNCTION public.recent_orders_feed(p_limit integer DEFAULT 50)
RETURNS TABLE(
  id uuid,
  order_number integer,
  package_name text,
  category text,
  network text,
  amount integer,
  status text,
  masked_phone text,
  phone_seed integer,
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    t.id,
    t.order_number,
    t.package_name,
    t.category,
    t.network,
    t.amount,
    t.status,
    regexp_replace(t.phone_number, '(\d{4})\d{3}(\d{3})', '\1***\2') AS masked_phone,
    COALESCE(NULLIF(right(t.phone_number, 3), '')::integer, 0) AS phone_seed,
    t.created_at
  FROM public.transactions t
  ORDER BY t.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100)
$$;
REVOKE ALL ON FUNCTION public.recent_orders_feed(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recent_orders_feed(integer) TO anon, authenticated, service_role;

-- Aggregate-only public stats
CREATE OR REPLACE FUNCTION public.public_order_stats()
RETURNS TABLE(completed_today bigint, completed_total bigint, unique_customers bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COUNT(*) FILTER (WHERE t.created_at >= date_trunc('day', now())),
    COUNT(*),
    COUNT(DISTINCT t.phone_number)
  FROM public.transactions t
  WHERE t.status = 'completed'
$$;
REVOKE ALL ON FUNCTION public.public_order_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_order_stats() TO anon, authenticated, service_role;

-- ============ CHAT ============
DROP POLICY IF EXISTS "Chat conversations publicly readable" ON public.chat_conversations;
DROP POLICY IF EXISTS "Chat conversations updatable" ON public.chat_conversations;
DROP POLICY IF EXISTS "Chat messages publicly readable" ON public.chat_messages;
DROP POLICY IF EXISTS "Chat messages updatable" ON public.chat_messages;
DROP POLICY IF EXISTS "Chat messages insertable" ON public.chat_messages;
REVOKE ALL ON public.chat_conversations FROM anon, authenticated;
REVOKE ALL ON public.chat_messages FROM anon, authenticated;
GRANT INSERT ON public.chat_conversations TO anon, authenticated;
GRANT INSERT ON public.chat_messages TO anon, authenticated;
GRANT ALL ON public.chat_conversations TO service_role;
GRANT ALL ON public.chat_messages TO service_role;

CREATE POLICY "Customers can send messages"
ON public.chat_messages FOR INSERT TO anon, authenticated
WITH CHECK (sender_type = 'user');

CREATE OR REPLACE FUNCTION public.touch_chat_conversation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.chat_conversations
  SET last_message_at = now(), updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_touch_chat_conversation ON public.chat_messages;
CREATE TRIGGER trg_touch_chat_conversation
AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.touch_chat_conversation();

CREATE OR REPLACE FUNCTION public.get_chat_conversations(p_phone text)
RETURNS SETOF public.chat_conversations
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.chat_conversations
  WHERE phone_number = p_phone
  ORDER BY last_message_at DESC
  LIMIT 50
$$;
REVOKE ALL ON FUNCTION public.get_chat_conversations(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_chat_conversations(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_chat_messages(p_conversation_id uuid)
RETURNS SETOF public.chat_messages
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.chat_messages
  WHERE conversation_id = p_conversation_id
  ORDER BY created_at ASC
  LIMIT 500
$$;
REVOKE ALL ON FUNCTION public.get_chat_messages(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_chat_messages(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.mark_chat_read(p_conversation_id uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.chat_messages
  SET is_read = true
  WHERE conversation_id = p_conversation_id AND sender_type = 'admin' AND is_read = false
$$;
REVOKE ALL ON FUNCTION public.mark_chat_read(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_chat_read(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.start_chat_conversation(p_phone text, p_subject text)
RETURNS SETOF public.chat_conversations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.chat_conversations (phone_number, subject)
  VALUES (p_phone, COALESCE(NULLIF(btrim(p_subject), ''), 'Support Request'))
  RETURNING id INTO v_id;
  RETURN QUERY SELECT * FROM public.chat_conversations WHERE id = v_id;
END; $$;
REVOKE ALL ON FUNCTION public.start_chat_conversation(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_chat_conversation(text, text) TO anon, authenticated, service_role;

-- ============ SMS LOGS ============
DROP POLICY IF EXISTS backend_insert_sms_logs ON public.sms_logs;
REVOKE ALL ON public.sms_logs FROM anon, authenticated;
GRANT ALL ON public.sms_logs TO service_role;

-- ============ SENSITIVE HELPERS: browser must not call these ============
REVOKE ALL ON FUNCTION public.hash_password(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_admin(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_admin_session(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_vendor(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vendor_login_status(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_stk_rate_limit(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_banned(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hash_password(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_admin(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_admin_session(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_vendor(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.vendor_login_status(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_stk_rate_limit(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_banned(text) TO service_role;