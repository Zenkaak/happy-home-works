import { supabase } from "@/integrations/supabase/client";

export const getAdminToken = () => localStorage.getItem("dasnet_admin_token");

/**
 * All privileged admin reads/writes go through the admin-api edge function,
 * which verifies the admin session server-side. The browser has no direct
 * database access to sensitive tables (vendors, withdrawals, transactions,
 * manual payments, chats, sms logs).
 */
export const adminApi = async (action: string, params: Record<string, any> = {}) => {
  const token = getAdminToken();
  if (!token) throw new Error("Not authenticated");
  const { data, error } = await supabase.functions.invoke("admin-api", {
    body: { action, ...params },
    headers: { "x-admin-token": token },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
};
