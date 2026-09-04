CREATE TABLE IF NOT EXISTS public.vendor_password_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  phone text NOT NULL,
  code text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  used boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.vendor_password_resets TO service_role;
ALTER TABLE public.vendor_password_resets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No public access to vendor_password_resets" ON public.vendor_password_resets FOR SELECT USING (false);

CREATE INDEX IF NOT EXISTS vendor_password_resets_phone_idx ON public.vendor_password_resets (phone, created_at DESC);