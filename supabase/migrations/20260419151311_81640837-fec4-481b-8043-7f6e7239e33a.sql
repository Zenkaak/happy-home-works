-- Backfill broadcast_contacts from existing transactions
INSERT INTO public.broadcast_contacts (phone_number)
SELECT DISTINCT phone_number FROM public.transactions
WHERE phone_number IS NOT NULL
ON CONFLICT (phone_number) DO NOTHING;

-- Ensure unique constraint exists (function uses ON CONFLICT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'broadcast_contacts_phone_number_key'
  ) THEN
    ALTER TABLE public.broadcast_contacts
      ADD CONSTRAINT broadcast_contacts_phone_number_key UNIQUE (phone_number);
  END IF;
END$$;

-- Create trigger to auto-add new transaction phones
DROP TRIGGER IF EXISTS trg_save_broadcast_contact ON public.transactions;
CREATE TRIGGER trg_save_broadcast_contact
AFTER INSERT ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.save_broadcast_contact();