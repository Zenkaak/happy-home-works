INSERT INTO public.app_settings (key, value) VALUES
  ('service_data_enabled','true'),
  ('service_kplc_enabled','true'),
  ('service_loans_enabled','true'),
  ('service_cyber_enabled','true')
ON CONFLICT (key) DO NOTHING;

DROP POLICY IF EXISTS "App settings readable" ON public.app_settings;
CREATE POLICY "Public service toggles readable" ON public.app_settings
FOR SELECT USING (key LIKE 'service\_%\_enabled');