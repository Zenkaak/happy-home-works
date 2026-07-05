-- Seed default values for new app_settings keys.
-- All credential keys are intentionally left absent — they fall back to
-- Vercel / Supabase environment variables until the admin overrides them
-- via the Settings panel.

INSERT INTO public.app_settings (key, value) VALUES
  ('transaction_type',   'CustomerPayBillOnline'),
  ('auto_payout_enabled','true')
ON CONFLICT (key) DO NOTHING;
