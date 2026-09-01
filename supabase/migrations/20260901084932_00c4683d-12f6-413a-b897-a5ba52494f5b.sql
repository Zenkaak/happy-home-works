CREATE TABLE public.customer_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  code text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_customer_otps_phone ON public.customer_otps (phone_number, created_at DESC);
GRANT ALL ON public.customer_otps TO service_role;
ALTER TABLE public.customer_otps ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.customer_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_customer_sessions_phone ON public.customer_sessions (phone_number);
GRANT ALL ON public.customer_sessions TO service_role;
ALTER TABLE public.customer_sessions ENABLE ROW LEVEL SECURITY;