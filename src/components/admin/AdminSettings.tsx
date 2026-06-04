import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Phone, Save, ShieldCheck } from "lucide-react";

const getAdminToken = () => localStorage.getItem("dasnet_admin_token");

const adminApi = async (action: string, params: Record<string, any> = {}) => {
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

const AdminSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [payoutPhone, setPayoutPhone] = useState("");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => (await adminApi("get_settings")).settings as Record<string, string>,
  });

  useEffect(() => {
    if (settings?.admin_payout_phone) setPayoutPhone(settings.admin_payout_phone);
  }, [settings]);

  const saveSetting = useMutation({
    mutationFn: async (vars: { key: string; value: string }) => await adminApi("update_setting", vars),
    onSuccess: (data: any, vars) => {
      toast({ title: "Saved", description: `${vars.key} updated to ${data.value}` });
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="font-display text-xl font-bold flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" /> Settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage runtime configuration. Changes take effect immediately for new transactions.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <div>
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary" /> Admin Payout Phone
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Every successful customer order auto-pays out (B2C) to this number. Format: 2547XXXXXXXX.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <input
              type="tel"
              inputMode="numeric"
              value={payoutPhone}
              onChange={(e) => setPayoutPhone(e.target.value)}
              placeholder="2547XXXXXXXX"
              className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-sm font-mono"
            />
            <button
              onClick={() => saveSetting.mutate({ key: "admin_payout_phone", value: payoutPhone })}
              disabled={saveSetting.isPending || !payoutPhone.trim()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50"
            >
              {saveSetting.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Payout Phone
            </button>
            {settings?.admin_payout_phone && (
              <p className="text-[11px] text-muted-foreground">
                Current: <span className="font-mono text-foreground">{settings.admin_payout_phone}</span>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminSettings;
