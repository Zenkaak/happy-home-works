UPDATE public.transactions
SET failure_reason = 'Safaricom blocked this STK push (often a blacklisted or restricted SIM). Use Pay Manually via Till 8448104.'
WHERE failure_reason = 'Failed due to an unresolved reason type.';