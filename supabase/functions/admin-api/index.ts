import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
  "Content-Type": "application/json",
};

const CALLBACK_ACTIONS = new Set([
  "account_balance_result",
  "account_balance_timeout",
  "admin_b2c_result",
  "admin_b2c_timeout",
]);

async function verifyAdmin(supabase: any, token: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("verify_admin_session", { p_token: token });
  if (error || !data) return null;
  return data as string;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders,
  });
}

function formatPhone(phone: string): string {
  const cleaned = String(phone || "").replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0") && cleaned.length === 10) return `254${cleaned.slice(1)}`;
  if (cleaned.startsWith("254") && cleaned.length === 12) return cleaned;
  return cleaned;
}

// Daraja AccountBalance format per account:
//   "Working Account|KES|481.00|481.00|0.00|0.00"
//   parts: [Label, Currency, Balance, Available, Reserved, Uncleared]
// We want the "Available" value (index 1 of numerics) — the previous code
// picked the last numeric (Uncleared) which is almost always 0.
const RELEVANT_LABELS = [
  "working account",
  "utility account",
  "mmf account",
  "merchant account",
  "float account",
];

function parseBalanceItems(rawValue: string | null | undefined) {
  if (!rawValue) return [];

  const all = rawValue
    .split("&")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const parts = entry.split("|").map((part) => part.trim());
      const label = parts[0] || "Account";
      const currency = parts.find((part) => /^[A-Z]{3}$/.test(part)) || "KES";
      const numericParts = parts
        .map((part) => Number(String(part).replace(/,/g, "")))
        .filter((value) => Number.isFinite(value));
      // Prefer the "Available" balance (2nd numeric). Fall back to first.
      const available = numericParts.length >= 2
        ? numericParts[1]
        : (numericParts[0] ?? 0);

      return { label, currency, available };
    });

  // Hide empty accounts that aren't part of the core wallet set, to keep
  // the admin view focused on the balances that actually move money.
  return all.filter((item) => {
    const isRelevant = RELEVANT_LABELS.includes(item.label.toLowerCase());
    return isRelevant || Number(item.available) > 0;
  });
}

async function requestDarajaToken() {
  const consumerKey = Deno.env.get("DARAJA_CONSUMER_KEY");
  const consumerSecret = Deno.env.get("DARAJA_CONSUMER_SECRET");

  if (!consumerKey || !consumerSecret) throw new Error("Daraja credentials not configured");

  const auth = btoa(`${consumerKey}:${consumerSecret}`);
  const response = await fetch(
    "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    { headers: { Authorization: `Basic ${auth}` } },
  );
  const data = await response.json();

  if (!data?.access_token) {
    throw new Error(data?.errorMessage || data?.error_description || "Failed to get Daraja token");
  }

  return data.access_token as string;
}

async function recordAudit(supabase: any, action: string, details: Record<string, unknown>, adminId?: string | null) {
  await supabase.from("audit_logs").insert({
    action,
    admin_id: adminId || null,
    details,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const url = new URL(req.url);
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const action = url.searchParams.get("action") || body?.action;
    if (!action) return json({ error: "Unknown action" }, 400);

    if (CALLBACK_ACTIONS.has(action)) {
      switch (action) {
        case "account_balance_result": {
          const result = body?.Result;
          const rawBalance = result?.ResultParameters?.ResultParameter?.find((item: any) => item.Key === "AccountBalance")?.Value;
          const snapshot = {
            created_at: new Date().toISOString(),
            items: parseBalanceItems(rawBalance),
            raw: rawBalance || null,
            result_code: result?.ResultCode ?? null,
          };

          await recordAudit(supabase, "paybill_balance_snapshot", snapshot, null);
          return json({ ResultCode: 0, ResultDesc: "Accepted" });
        }
        case "account_balance_timeout": {
          await recordAudit(supabase, "paybill_balance_timeout", { created_at: new Date().toISOString(), body }, null);
          return json({ ResultCode: 0, ResultDesc: "Accepted" });
        }
        case "admin_b2c_result": {
          await recordAudit(supabase, "admin_b2c_result", { created_at: new Date().toISOString(), body }, null);
          return json({ ResultCode: 0, ResultDesc: "Accepted" });
        }
        case "admin_b2c_timeout": {
          await recordAudit(supabase, "admin_b2c_timeout", { created_at: new Date().toISOString(), body }, null);
          return json({ ResultCode: 0, ResultDesc: "Accepted" });
        }
      }
    }

    const adminToken = req.headers.get("x-admin-token");
    if (!adminToken) return json({ error: "Unauthorized" }, 401);

    const adminId = await verifyAdmin(supabase, adminToken);
    if (!adminId) return json({ error: "Invalid or expired session" }, 401);

    const { action: _omitAction, ...params } = (body || {}) as Record<string, unknown>;

    switch (action) {
      case "update_vendor": {
        const { id, ...updates } = params;
        const { error } = await supabase.from("vendors").update(updates).eq("id", id);
        if (error) throw error;
        return json({ success: true });
      }
      case "delete_vendor": {
        const { error } = await supabase.from("vendors").delete().eq("id", params.id);
        if (error) throw error;
        return json({ success: true });
      }
      case "ban_vendor": {
        const { id, phone_number } = params;
        const { error: updateErr } = await supabase.from("vendors").update({ status: "banned" }).eq("id", id);
        if (updateErr) throw updateErr;
        const { error: banErr } = await supabase.from("banned_numbers").upsert({ phone_number });
        if (banErr) throw banErr;
        return json({ success: true });
      }
      case "update_product": {
        const { id, ...updates } = params;
        const { error } = await supabase.from("products").update(updates).eq("id", id);
        if (error) throw error;
        return json({ success: true });
      }
      case "delete_product": {
        const { error } = await supabase.from("products").delete().eq("id", params.id);
        if (error) throw error;
        return json({ success: true });
      }
      case "delete_transaction": {
        const { error } = await supabase.from("transactions").delete().eq("id", params.id);
        if (error) throw error;
        return json({ success: true });
      }
      case "update_transaction_status": {
        const { error } = await supabase.from("transactions").update({ status: params.status }).eq("id", params.id);
        if (error) throw error;
        return json({ success: true });
      }
      case "create_product": {
        const { error } = await supabase.from("products").insert(params);
        if (error) throw error;
        return json({ success: true });
      }
      case "get_broadcast_contacts": {
        const { count, error } = await supabase.from("broadcast_contacts").select("*", { count: "exact", head: true });
        if (error) throw error;
        return json({ count: count ?? 0 });
      }
      case "list_broadcast_contacts": {
        const search = (params?.search || "").toString().trim();
        let q = supabase.from("broadcast_contacts").select("id, phone_number, created_at").order("created_at", { ascending: false }).limit(500);
        if (search) q = q.ilike("phone_number", `%${search}%`);
        const { data, error } = await q;
        if (error) throw error;
        return json({ contacts: data ?? [] });
      }
      case "delete_broadcast_contact": {
        const { error } = await supabase.from("broadcast_contacts").delete().eq("id", params.id);
        if (error) throw error;
        return json({ success: true });
      }
      case "get_sms_logs": {
        const { data, error } = await supabase
          .from("sms_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200);
        if (error) throw error;
        return json({ logs: data ?? [] });
      }
      case "broadcast_sms": {
        const { data: contacts, error: cErr } = await supabase.from("broadcast_contacts").select("phone_number");
        if (cErr) throw cErr;

        const batchId = `broadcast-${Date.now()}`;
        let successCount = 0;
        let failCount = 0;
        for (const contact of contacts || []) {
          try {
            const smsRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-sms`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-admin-token": adminToken,
                apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
                Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")!}`,
              },
              body: JSON.stringify({ phone: contact.phone_number, message: params.message }),
            });
            const smsData = await smsRes.json();
            const ok = smsRes.ok && !smsData?.error && smsData?.success !== false;
            await supabase.from("sms_logs").insert({
              phone_number: contact.phone_number,
              message: params.message,
              status: ok ? "sent" : "failed",
              batch_id: batchId,
            });
            if (ok) successCount += 1;
            else failCount += 1;
          } catch {
            failCount += 1;
          }
        }
        return json({ successCount, failCount, total: (contacts || []).length });
      }
      case "create_announcement": {
        const { error } = await supabase.from("announcements").insert({ title: params.title, message: params.message });
        if (error) throw error;
        return json({ success: true });
      }
      case "toggle_announcement": {
        const { error } = await supabase.from("announcements").update({ is_active: params.is_active }).eq("id", params.id);
        if (error) throw error;
        return json({ success: true });
      }
      case "delete_announcement": {
        const { error } = await supabase.from("announcements").delete().eq("id", params.id);
        if (error) throw error;
        return json({ success: true });
      }
      case "send_chat_reply": {
        const { conversation_id, message: msg } = params;
        const { error } = await supabase.from("chat_messages").insert({ conversation_id, sender_type: "admin", message: msg });
        if (error) throw error;
        await supabase.from("chat_conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversation_id);
        return json({ success: true });
      }
      case "get_paybill_balance": {
        const { data, error } = await supabase
          .from("audit_logs")
          .select("created_at, details")
          .eq("action", "paybill_balance_snapshot")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        return json({ snapshot: data ? { created_at: data.created_at, ...(data.details as Record<string, unknown>) } : null });
      }
      case "refresh_paybill_balance": {
        const accessToken = await requestDarajaToken();
        const shortcode = Deno.env.get("MPESA_SHORTCODE");
        const initiatorName = Deno.env.get("MPESA_INITIATOR_NAME");
        const securityCredential = Deno.env.get("MPESA_SECURITY_CREDENTIAL");
        const baseUrl = Deno.env.get("SUPABASE_URL");
        if (!shortcode || !initiatorName || !securityCredential || !baseUrl) {
          throw new Error("M-Pesa balance settings are not configured");
        }

        const payload = {
          Initiator: initiatorName,
          SecurityCredential: securityCredential,
          CommandID: "AccountBalance",
          PartyA: shortcode,
          IdentifierType: "4",
          Remarks: "Admin paybill balance request",
          QueueTimeOutURL: `${baseUrl}/functions/v1/admin-api?action=account_balance_timeout`,
          ResultURL: `${baseUrl}/functions/v1/admin-api?action=account_balance_result`,
        };

        const response = await fetch("https://api.safaricom.co.ke/mpesa/accountbalance/v1/query", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok || data?.ResponseCode !== "0") {
          throw new Error(data?.errorMessage || data?.ResponseDescription || "Balance request failed");
        }
        await recordAudit(supabase, "paybill_balance_request", { created_at: new Date().toISOString(), response: data }, adminId);
        return json({ success: true, data });
      }
      case "initiate_admin_b2c": {
        const accessToken = await requestDarajaToken();
        const shortcode = Deno.env.get("MPESA_SHORTCODE");
        const initiatorName = Deno.env.get("MPESA_INITIATOR_NAME");
        const securityCredential = Deno.env.get("MPESA_SECURITY_CREDENTIAL");
        const baseUrl = Deno.env.get("SUPABASE_URL");
        if (!shortcode || !initiatorName || !securityCredential || !baseUrl) {
          throw new Error("M-Pesa payout settings are not configured");
        }

        const payoutPhone = formatPhone(params.phone);
        const payoutAmount = Math.floor(Number(params.amount));
        if (!payoutPhone || !payoutAmount || payoutAmount < 1) {
          throw new Error("Enter a valid phone number and amount");
        }

        const payload = {
          InitiatorName: initiatorName,
          SecurityCredential: securityCredential,
          CommandID: "BusinessPayment",
          Amount: payoutAmount,
          PartyA: shortcode,
          PartyB: payoutPhone,
          Remarks: "Admin initiated B2C payout",
          QueueTimeOutURL: `${baseUrl}/functions/v1/admin-api?action=admin_b2c_timeout`,
          ResultURL: `${baseUrl}/functions/v1/admin-api?action=admin_b2c_result`,
          Occasion: "AdminPayout",
        };

        const response = await fetch("https://api.safaricom.co.ke/mpesa/b2c/v1/paymentrequest", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok || data?.ResponseCode !== "0") {
          throw new Error(data?.errorMessage || data?.ResponseDescription || "B2C request failed");
        }
        await recordAudit(supabase, "admin_b2c_request", {
          created_at: new Date().toISOString(),
          phone: payoutPhone,
          amount: payoutAmount,
          response: data,
        }, adminId);
        return json({ success: true, data });
      }
      case "send_test_sms": {
        const phone = String(params.phone || "").trim();
        if (!phone) throw new Error("Phone number required");
        // Read OTS key from app_settings first, fall back to env var
        const { data: settingsRows } = await supabase.from("app_settings").select("key, value");
        const settingsMap: Record<string, string> = {};
        (settingsRows || []).forEach((row: any) => { settingsMap[row.key] = row.value; });
        const otsApiKey = settingsMap.ots_api_key || Deno.env.get("OTS_API_KEY");
        if (!otsApiKey) throw new Error("OTS_API_KEY not configured. Set it in Settings → SMS Gateway first.");
        const formatted = phone.replace(/[^0-9]/g, "");
        const phone254 = formatted.startsWith("0") && formatted.length === 10
          ? `254${formatted.slice(1)}`
          : formatted;
        const message = "DASNET Admin Test — your notification SMS is working correctly. Every completed order will alert this number.";
        const smsRes = await fetch("https://sms.ots.co.ke/api/v3/sms/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${otsApiKey}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ recipient: phone254, sender_id: "PROCALL", type: "plain", message }),
        });
        const smsData = await smsRes.json().catch(() => ({}));
        if (!smsRes.ok) throw new Error(smsData?.message || smsData?.error || "SMS sending failed");
        await recordAudit(supabase, "test_sms_sent", { phone: phone254, response: smsData }, adminId);
        return json({ success: true });
      }
      case "get_settings": {
        const { data, error } = await supabase.from("app_settings").select("key, value, updated_at");
        if (error) throw error;
        const map: Record<string, string> = {};
        (data || []).forEach((row: any) => { map[row.key] = row.value; });
        return json({ settings: map });
      }
      case "update_setting": {
        const key = String(params.key || "").trim();
        const value = String(params.value ?? "").trim();
        if (!key) throw new Error("Missing setting key");
        if (key === "admin_payout_phone") {
          const formatted = formatPhone(value);
          if (!formatted || formatted.length !== 12 || !formatted.startsWith("254")) {
            throw new Error("Enter a valid Kenyan phone number");
          }
          const { error } = await supabase
            .from("app_settings")
            .upsert({ key, value: formatted, updated_at: new Date().toISOString() });
          if (error) throw error;
          await recordAudit(supabase, "update_setting", { key, value: formatted }, adminId);
          return json({ success: true, value: formatted });
        }
        const { error } = await supabase
          .from("app_settings")
          .upsert({ key, value, updated_at: new Date().toISOString() });
        if (error) throw error;
        await recordAudit(supabase, "update_setting", { key, value }, adminId);
        return json({ success: true, value });
      }
      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (error: unknown) {
    const msg = error instanceof Error
      ? error.message
      : (error && typeof error === "object" && "message" in (error as any))
        ? String((error as any).message)
        : (typeof error === "string" ? error : JSON.stringify(error));
    console.error("admin-api error:", error);
    return json({ error: msg || "Unknown error" }, 500);
  }
});
