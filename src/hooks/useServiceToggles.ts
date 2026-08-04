import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ToggleKey = "data" | "kplc" | "loans" | "cyber";

export type ServiceToggles = Record<ToggleKey, boolean>;

const DEFAULTS: ServiceToggles = { data: true, kplc: true, loans: true, cyber: true };

export const fetchServiceToggles = async (): Promise<ServiceToggles> => {
  const { data, error } = await supabase.from("app_settings").select("key, value");
  if (error) return DEFAULTS;
  const result = { ...DEFAULTS };
  (data ?? []).forEach((row: { key: string; value: string | null }) => {
    const match = row.key.match(/^service_(data|kplc|loans|cyber)_enabled$/);
    if (match) result[match[1] as ToggleKey] = row.value !== "false";
  });
  return result;
};

export const useServiceToggles = () =>
  useQuery({
    queryKey: ["service-toggles"],
    queryFn: fetchServiceToggles,
    staleTime: 60_000,
    placeholderData: DEFAULTS,
  });
