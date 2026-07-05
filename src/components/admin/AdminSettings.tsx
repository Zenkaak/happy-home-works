import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Save, ShieldCheck, Bell, CreditCard, MessageSquare,
  Send, Eye, EyeOff, ToggleLeft, ToggleRight, RefreshCw, Zap,
} from "lucide-react";

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

// ---------------------------------------------------------------------------
// Reusable field components
// ---------------------------------------------------------------------------

type FieldProps = {
  label: string;
  description?: string;
  settingKey: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  isSaving: boolean;
  placeholder?: string;
  type?: "text" | "password" | "tel";
  current?: string;
};

function SettingField({
  label, description, value, onChange, onSave, isSaving,
  placeholder, type = "text", current,
}: FieldProps) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-foreground/80">{label}</label>
      {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={isPassword && !visible ? "password" : "text"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm font-mono pr-10"
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
        <button
          onClick={onSave}
          disabled={isSaving || !value.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50 shrink-0"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save
        </button>
      </div>
      {current && (
        <p className="text-[11px] text-muted-foreground">
          Current:{" "}
          <span className="font-mono text-foreground">
            {isPassword ? "••••••••" : current}
          </span>
        </p>
      )}
    </div>
  );
}

type ToggleFieldProps = {
  label: string;
  description?: string;
  settingKey: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  isSaving: boolean;
};

function ToggleField({ label, description, checked, onToggle, isSaving }: ToggleFieldProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="flex-1">
        <p className="text-xs font-semibold text-foreground/80">{label}</p>
        {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onToggle(!checked)}
        disabled={isSaving}
        className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-primary disabled:opacity-50"
      >
        {isSaving ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : checked ? (
          <ToggleRight className="w-8 h-8 text-primary" />
        ) : (
          <ToggleLeft className="w-8 h-8 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------
function Section({ icon: Icon, title, description, children }: {
  icon: any; title: string; description: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div>
        <h3 className="font-bold text-sm flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" /> {title}
        </h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="space-y-4 divide-y divide-border">
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const AdminSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Field states
  const [adminNotifyPhone, setAdminNotifyPhone] = useState("");
  const [payoutPhone, setPayoutPhone] = useState("");
  const [autoPayoutEnabled, setAutoPayoutEnabled] = useState(true);
  const [transactionType, setTransactionType] = useState("CustomerPayBillOnline");
  const [shortcode, setShortcode] = useState("");
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [passkey, setPasskey] = useState("");
  const [otsApiKey, setOtsApiKey] = useState("");
  const [initiatorName, setInitiatorName] = useState("");
  const [securityCredential, setSecurityCredential] = useState("");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => (await adminApi("get_settings")).settings as Record<string, string>,
  });

  useEffect(() => {
    if (!settings) return;
    if (settings.admin_notify_phone) setAdminNotifyPhone(settings.admin_notify_phone);
    if (settings.admin_payout_phone) setPayoutPhone(settings.admin_payout_phone);
    if (settings.auto_payout_enabled !== undefined) setAutoPayoutEnabled(settings.auto_payout_enabled !== "false");
    if (settings.transaction_type) setTransactionType(settings.transaction_type);
    if (settings.mpesa_shortcode) setShortcode(settings.mpesa_shortcode);
    if (settings.daraja_consumer_key) setConsumerKey(settings.daraja_consumer_key);
    if (settings.daraja_consumer_secret) setConsumerSecret(settings.daraja_consumer_secret);
    if (settings.daraja_passkey) setPasskey(settings.daraja_passkey);
    if (settings.ots_api_key) setOtsApiKey(settings.ots_api_key);
    if (settings.mpesa_initiator_name) setInitiatorName(settings.mpesa_initiator_name);
    if (settings.mpesa_security_credential) setSecurityCredential(settings.mpesa_security_credential);
  }, [settings]);

  const saveSetting = useMutation({
    mutationFn: async (vars: { key: string; value: string }) => await adminApi("update_setting", vars),
    onSuccess: (_data: any, vars) => {
      toast({ title: "Saved", description: `${vars.key.replace(/_/g, " ")} updated successfully.` });
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: (err: any) => toast({ title: "Failed to save", description: err.message, variant: "destructive" }),
  });

  const testSms = useMutation({
    mutationFn: async (phone: string) => await adminApi("send_test_sms", { phone }),
    onSuccess: () => toast({ title: "Test SMS sent!", description: "Check your phone — the message should arrive within seconds." }),
    onError: (err: any) => toast({ title: "Test SMS failed", description: err.message, variant: "destructive" }),
  });

  const save = (key: string, value: string) => saveSetting.mutate({ key, value });
  const isSaving = saveSetting.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading settings…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="font-display text-xl font-bold flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" /> Settings
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          All changes take effect immediately across the app — no code changes needed.
        </p>
      </div>

      {/* ── Notifications ── */}
      <Section icon={Bell} title="Order Notifications" description="Receive an SMS on your phone every time a customer completes a payment.">
        <SettingField
          label="Admin Notify Phone"
          description="This number gets an SMS — 'Order completed KSH X' — the moment any order is paid."
          settingKey="admin_notify_phone"
          value={adminNotifyPhone}
          onChange={setAdminNotifyPhone}
          onSave={() => save("admin_notify_phone", adminNotifyPhone)}
          isSaving={isSaving}
          placeholder="2547XXXXXXXX"
          type="tel"
          current={settings?.admin_notify_phone}
        />
        <div className="pt-1">
          <button
            onClick={() => {
              if (!adminNotifyPhone.trim()) {
                toast({ title: "No phone set", description: "Enter and save a notify phone first.", variant: "destructive" });
                return;
              }
              testSms.mutate(adminNotifyPhone);
            }}
            disabled={testSms.isPending || !adminNotifyPhone.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary border border-border text-xs font-bold text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all disabled:opacity-50"
          >
            {testSms.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
            {testSms.isPending ? "Sending…" : "Send Test SMS"}
          </button>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Sends a test message to the notify phone above to confirm delivery is working.
          </p>
        </div>
      </Section>

      {/* ── M-Pesa / STK ── */}
      <Section icon={CreditCard} title="M-Pesa / STK Push" description="Daraja API credentials for STK push. Overrides the server environment variables immediately.">
        {/* Transaction type toggle */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-foreground/80">Transaction Type</label>
          <p className="text-[11px] text-muted-foreground">
            Use <strong>PayBill</strong> for Paybill shortcodes, <strong>Buy Goods</strong> for Till numbers.
          </p>
          <div className="flex gap-2">
            {(["CustomerPayBillOnline", "CustomerBuyGoodsOnline"] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTransactionType(t);
                  save("transaction_type", t);
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                  transactionType === t
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary text-muted-foreground border-border hover:border-primary/40"
                }`}
              >
                {t === "CustomerPayBillOnline" ? "PayBill" : "Buy Goods (Till)"}
              </button>
            ))}
          </div>
          {settings?.transaction_type && (
            <p className="text-[11px] text-muted-foreground">
              Current: <span className="font-mono text-foreground">{settings.transaction_type}</span>
            </p>
          )}
        </div>

        <SettingField
          label="Shortcode"
          description="Your Paybill or Till number."
          settingKey="mpesa_shortcode"
          value={shortcode}
          onChange={setShortcode}
          onSave={() => save("mpesa_shortcode", shortcode)}
          isSaving={isSaving}
          placeholder="174379"
          current={settings?.mpesa_shortcode}
        />
        <SettingField
          label="Consumer Key"
          settingKey="daraja_consumer_key"
          value={consumerKey}
          onChange={setConsumerKey}
          onSave={() => save("daraja_consumer_key", consumerKey)}
          isSaving={isSaving}
          placeholder="Daraja consumer key"
          type="password"
          current={settings?.daraja_consumer_key}
        />
        <SettingField
          label="Consumer Secret"
          settingKey="daraja_consumer_secret"
          value={consumerSecret}
          onChange={setConsumerSecret}
          onSave={() => save("daraja_consumer_secret", consumerSecret)}
          isSaving={isSaving}
          placeholder="Daraja consumer secret"
          type="password"
          current={settings?.daraja_consumer_secret}
        />
        <SettingField
          label="Passkey"
          settingKey="daraja_passkey"
          value={passkey}
          onChange={setPasskey}
          onSave={() => save("daraja_passkey", passkey)}
          isSaving={isSaving}
          placeholder="Daraja STK passkey"
          type="password"
          current={settings?.daraja_passkey}
        />
      </Section>

      {/* ── SMS Gateway ── */}
      <Section icon={MessageSquare} title="SMS Gateway (OTS)" description="OTS API key used to send confirmation, failure, and notification SMS messages.">
        <SettingField
          label="OTS API Key"
          description="Get your key from sms.ots.co.ke. Overrides the server environment variable."
          settingKey="ots_api_key"
          value={otsApiKey}
          onChange={setOtsApiKey}
          onSave={() => save("ots_api_key", otsApiKey)}
          isSaving={isSaving}
          placeholder="OTS Bearer token"
          type="password"
          current={settings?.ots_api_key}
        />
      </Section>

      {/* ── B2C Payouts ── */}
      <Section icon={Send} title="B2C Auto-Payouts" description="Automatically send the order amount to the admin payout phone via M-Pesa B2C after each completed payment.">
        <ToggleField
          label="Auto-Payout Enabled"
          description="When on, every completed order triggers an automatic B2C payout to the payout phone."
          settingKey="auto_payout_enabled"
          checked={autoPayoutEnabled}
          onToggle={(checked) => {
            setAutoPayoutEnabled(checked);
            save("auto_payout_enabled", checked ? "true" : "false");
          }}
          isSaving={isSaving}
        />
        <SettingField
          label="Payout Phone"
          description="M-Pesa number that receives the auto B2C payout. Format: 2547XXXXXXXX."
          settingKey="admin_payout_phone"
          value={payoutPhone}
          onChange={setPayoutPhone}
          onSave={() => save("admin_payout_phone", payoutPhone)}
          isSaving={isSaving}
          placeholder="2547XXXXXXXX"
          type="tel"
          current={settings?.admin_payout_phone}
        />
        <SettingField
          label="Initiator Name"
          description="M-Pesa API initiator username for B2C transactions."
          settingKey="mpesa_initiator_name"
          value={initiatorName}
          onChange={setInitiatorName}
          onSave={() => save("mpesa_initiator_name", initiatorName)}
          isSaving={isSaving}
          placeholder="apiuser123"
          current={settings?.mpesa_initiator_name}
        />
        <SettingField
          label="Security Credential"
          description="Encrypted initiator password from the Daraja portal."
          settingKey="mpesa_security_credential"
          value={securityCredential}
          onChange={setSecurityCredential}
          onSave={() => save("mpesa_security_credential", securityCredential)}
          isSaving={isSaving}
          placeholder="Encrypted credential string"
          type="password"
          current={settings?.mpesa_security_credential}
        />
      </Section>

      <div className="flex items-center gap-2 text-[11px] text-muted-foreground px-1">
        <RefreshCw className="w-3 h-3" />
        All settings are saved to the database and take effect on the next transaction — no restart needed.
      </div>
    </div>
  );
};

export default AdminSettings;
