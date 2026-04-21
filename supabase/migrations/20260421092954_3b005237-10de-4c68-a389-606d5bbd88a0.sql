CREATE OR REPLACE FUNCTION public.vendor_login_status(p_phone text, p_password text)
RETURNS TABLE(vendor_id uuid, vendor_name text, vendor_referral_code text, vendor_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE v_vendor record;
BEGIN
  SELECT * INTO v_vendor FROM public.vendors
  WHERE phone = p_phone AND password_hash = extensions.crypt(p_password, password_hash);
  IF v_vendor IS NULL THEN RETURN; END IF;
  RETURN QUERY SELECT v_vendor.id, v_vendor.name, v_vendor.referral_code, v_vendor.status;
END; $function$;