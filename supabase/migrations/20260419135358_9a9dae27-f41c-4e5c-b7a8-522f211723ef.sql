-- ============================================================================
-- DASNET full schema (port of original 5 migrations)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.hash_password(p_password text)
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT extensions.crypt(p_password, extensions.gen_salt('bf', 10));
$$;

CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No public access to admin_users" ON public.admin_users FOR SELECT USING (false);

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('data','kplc','loans')),
  network TEXT CHECK (network IN ('safaricom','airtel','telkom')),
  data_amount TEXT,
  minutes TEXT,
  price INTEGER NOT NULL,
  units TEXT,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  is_promo BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products are publicly readable" ON public.products FOR SELECT USING (true);
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  package_name TEXT NOT NULL,
  category TEXT NOT NULL,
  network TEXT,
  phone_number TEXT NOT NULL,
  service_number TEXT,
  meter_number TEXT,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  mpesa_reference TEXT,
  kplc_token TEXT,
  stk_checkout_id TEXT,
  failure_reason TEXT,
  referral_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Transactions publicly readable" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Transactions insertable" ON public.transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Transactions updatable" ON public.transactions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Transactions deletable" ON public.transactions FOR DELETE USING (true);
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_transactions_referral ON public.transactions(referral_code, status, created_at DESC);
CREATE INDEX idx_transactions_phone ON public.transactions(phone_number, created_at DESC);
CREATE INDEX idx_transactions_status ON public.transactions(status, created_at DESC);

CREATE TABLE public.sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  batch_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "SMS logs not public" ON public.sms_logs FOR SELECT USING (false);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  details JSONB,
  admin_id UUID REFERENCES public.admin_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Audit logs not public" ON public.audit_logs FOR SELECT USING (false);

CREATE TABLE public.admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No public access to admin_sessions" ON public.admin_sessions FOR SELECT USING (false);

CREATE TABLE public.broadcast_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.broadcast_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Broadcast contacts not public" ON public.broadcast_contacts FOR SELECT USING (false);

CREATE OR REPLACE FUNCTION public.save_broadcast_contact()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.broadcast_contacts (phone_number) VALUES (NEW.phone_number)
  ON CONFLICT (phone_number) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_save_broadcast_contact
AFTER INSERT ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.save_broadcast_contact();

CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Announcements publicly readable" ON public.announcements FOR SELECT USING (true);
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT 'Support Request',
  status TEXT NOT NULL DEFAULT 'open',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chat conversations publicly readable" ON public.chat_conversations FOR SELECT USING (true);
CREATE POLICY "Chat conversations insertable" ON public.chat_conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Chat conversations updatable" ON public.chat_conversations FOR UPDATE USING (true) WITH CHECK (true);
CREATE TRIGGER update_chat_conversations_updated_at BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL DEFAULT 'user',
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chat messages publicly readable" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "Chat messages insertable" ON public.chat_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Chat messages updatable" ON public.chat_messages FOR UPDATE USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;

CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  mpesa_payout TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  referral_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(4), 'hex'),
  commission_rate NUMERIC NOT NULL DEFAULT 0.10,
  commission_balance NUMERIC NOT NULL DEFAULT 0,
  total_sales INTEGER NOT NULL DEFAULT 0,
  total_revenue NUMERIC NOT NULL DEFAULT 0,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors publicly readable" ON public.vendors FOR SELECT USING (true);
CREATE POLICY "Vendors insertable" ON public.vendors FOR INSERT WITH CHECK (true);
CREATE POLICY "Vendors updatable" ON public.vendors FOR UPDATE USING (true) WITH CHECK (true);
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.banned_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL UNIQUE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.banned_numbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Banned numbers not public" ON public.banned_numbers FOR SELECT USING (false);

CREATE TABLE public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  mpesa_reference TEXT,
  conversation_id TEXT,
  failure_reason TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Withdrawals publicly readable" ON public.withdrawals FOR SELECT USING (true);
CREATE POLICY "Withdrawals insertable" ON public.withdrawals FOR INSERT WITH CHECK (true);
CREATE POLICY "Withdrawals updatable" ON public.withdrawals FOR UPDATE USING (true) WITH CHECK (true);
CREATE TRIGGER update_withdrawals_updated_at BEFORE UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_withdrawals_status ON public.withdrawals(status, created_at DESC);

CREATE TABLE public.manual_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  amount INTEGER NOT NULL,
  mpesa_code TEXT NOT NULL UNIQUE,
  package_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.manual_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manual payments insertable" ON public.manual_payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Manual payments readable" ON public.manual_payments FOR SELECT USING (true);
CREATE POLICY "Manual payments updatable" ON public.manual_payments FOR UPDATE USING (true) WITH CHECK (true);
CREATE TRIGGER manual_payments_updated_at BEFORE UPDATE ON public.manual_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_manual_payments_status ON public.manual_payments(status, created_at DESC);

CREATE TABLE public.stk_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stk_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rate limits not public" ON public.stk_rate_limits FOR SELECT USING (false);
CREATE INDEX idx_stk_rate_phone_time ON public.stk_rate_limits(phone_number, attempted_at DESC);

CREATE OR REPLACE FUNCTION public.verify_admin(p_username text, p_password text)
RETURNS TABLE(admin_id uuid, session_token text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_admin_id uuid; v_token text;
BEGIN
  SELECT id INTO v_admin_id FROM public.admin_users
  WHERE username = p_username AND password_hash = extensions.crypt(p_password, password_hash);
  IF v_admin_id IS NULL THEN RETURN; END IF;
  DELETE FROM public.admin_sessions WHERE expires_at < now();
  INSERT INTO public.admin_sessions (admin_id) VALUES (v_admin_id) RETURNING id::text INTO v_token;
  RETURN QUERY SELECT v_admin_id, v_token;
END; $$;

CREATE OR REPLACE FUNCTION public.verify_admin_session(p_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin_id uuid;
BEGIN
  SELECT admin_id INTO v_admin_id FROM public.admin_sessions
  WHERE id::text = p_token AND expires_at > now();
  RETURN v_admin_id;
END; $$;

CREATE OR REPLACE FUNCTION public.verify_vendor(p_phone text, p_password text)
RETURNS TABLE(vendor_id uuid, vendor_name text, vendor_referral_code text, vendor_status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_vendor record;
BEGIN
  SELECT * INTO v_vendor FROM public.vendors
  WHERE phone = p_phone AND password_hash = extensions.crypt(p_password, password_hash);
  IF v_vendor IS NULL THEN RETURN; END IF;
  IF v_vendor.status = 'pending' THEN
    UPDATE public.vendors SET status = 'approved', approved_at = now() WHERE id = v_vendor.id;
    v_vendor.status := 'approved';
  END IF;
  IF v_vendor.status NOT IN ('approved') THEN RETURN; END IF;
  RETURN QUERY SELECT v_vendor.id, v_vendor.name, v_vendor.referral_code, v_vendor.status;
END; $$;

CREATE OR REPLACE FUNCTION public.credit_vendor_commission()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_vendor_id UUID; v_rate NUMERIC;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') AND NEW.referral_code IS NOT NULL THEN
    SELECT id, commission_rate INTO v_vendor_id, v_rate FROM public.vendors WHERE referral_code = NEW.referral_code;
    IF v_vendor_id IS NOT NULL THEN
      UPDATE public.vendors
      SET commission_balance = commission_balance + (NEW.amount * v_rate),
          total_sales = total_sales + 1,
          total_revenue = total_revenue + NEW.amount
      WHERE id = v_vendor_id;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_credit_vendor_commission
AFTER UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.credit_vendor_commission();

CREATE OR REPLACE FUNCTION public.check_stk_rate_limit(p_phone TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INTEGER;
BEGIN
  DELETE FROM public.stk_rate_limits WHERE attempted_at < now() - interval '1 hour';
  SELECT COUNT(*) INTO v_count FROM public.stk_rate_limits
  WHERE phone_number = p_phone AND attempted_at > now() - interval '5 minutes';
  IF v_count >= 3 THEN RETURN FALSE; END IF;
  INSERT INTO public.stk_rate_limits (phone_number) VALUES (p_phone);
  RETURN TRUE;
END; $$;

CREATE OR REPLACE FUNCTION public.is_banned(p_phone TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.banned_numbers WHERE phone_number = p_phone);
$$;

GRANT EXECUTE ON FUNCTION public.verify_admin(text, text) TO service_role, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_admin_session(text) TO service_role, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_vendor(text, text) TO service_role, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_stk_rate_limit(text) TO service_role, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_banned(text) TO service_role, anon, authenticated;

INSERT INTO public.admin_users (username, password_hash, phone)
VALUES ('admin', public.hash_password('admin44'), '0751414437');