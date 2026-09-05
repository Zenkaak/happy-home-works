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

const CUSTOMER_ACCOUNT_URL = "https://hitechz.vercel.app/account";
const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
  awaiting_activation: "Pending Activation",
};

function buildOrderStatusMessage(
  tx: { order_number?: number | null; package_name: string },
  status: string,
  activationAmount?: number | null,
) {
  const label = STATUS_LABELS[status] || status;
  const order = tx.order_number ? ` #${tx.order_number}` : "";
  let message = `DASNET Order${order} update\n${tx.package_name}: ${label}.`;

  if (status === "awaiting_activation") {
    message += ` Pay KES ${Number(activationAmount || 0).toLocaleString()} to activate.`;
  } else if (status === "completed") {
    message += " Your order is ready.";
  } else if (status === "failed") {
    message += " Please log in to review and try again.";
  }

  return `${message}\nCheck your account: ${CUSTOMER_ACCOUNT_URL}`;
}

async function sendOrderStatusSms(
  supabase: any,
  tx: { id: string; phone_number: string; order_number?: number | null; package_name: string },
  status: string,
  activationAmount?: number | null,
) {
  const message = buildOrderStatusMessage(tx, status, activationAmount);
  const { data: setting } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "ots_api_key")
    .maybeSingle();
  const apiKey = setting?.value || Deno.env.get("OTS_API_KEY");

  if (!apiKey) {
    return { ok: false, message, error: "SMS gateway is not configured" };
  }

  const response = await fetch("https://sms.ots.co.ke/api/v3/sms/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      recipient: formatPhone(tx.phone_number),
      sender_id: "PROCALL",
      type: "plain",
      message,
    }),
  });
  const data = await response.json().catch(() => ({}));
  const recipientError = Array.isArray(data?.recipients)
    ? data.recipients.find((recipient: any) => recipient.status && !/submit/i.test(String(recipient.status)))
    : null;
  const error =
    data?.status === "error"
      ? data.message || "SMS rejected by gateway"
      : data?.code && Number(data.code) >= 400
        ? data.message || "SMS rejected by gateway"
        : recipientError?.reason || recipientError?.status || null;

  return {
    ok: response.ok && !error,
    message,
    error: error || (!response.ok ? data?.message || `Gateway HTTP error ${response.status}` : null),
    data,
  };
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
      // ---------- privileged reads (browser has no direct table access) ----------
      case "list_transactions": {
        const limit = Math.min(Number(params.limit) || 200, 500);
        const { data, error } = await supabase
          .from("transactions").select("*")
          .order("created_at", { ascending: false }).limit(limit);
        if (error) throw error;
        return json({ transactions: data ?? [] });
      }
      case "list_vendors": {
        const { data, error } = await supabase
          .from("vendors")
          .select("id, name, phone, mpesa_payout, status, referral_code, commission_rate, commission_balance, total_sales, total_revenue, approved_at, created_at")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return json({ vendors: data ?? [] });
      }
      case "list_withdrawals": {
        const { data, error } = await supabase
          .from("withdrawals")
          .select("*, vendors(name, phone, mpesa_payout)")
          .order("created_at", { ascending: false }).limit(100);
        if (error) throw error;
        return json({ withdrawals: data ?? [] });
      }
      case "update_withdrawal": {
        const { id, updates, refund } = params as any;
        const { error } = await supabase.from("withdrawals").update(updates || {}).eq("id", id);
        if (error) throw error;
        if (refund?.vendor_id && Number(refund.amount) > 0) {
          const { data: v } = await supabase
            .from("vendors").select("commission_balance").eq("id", refund.vendor_id).single();
          const { error: rErr } = await supabase.from("vendors")
            .update({ commission_balance: Number(v?.commission_balance || 0) + Number(refund.amount) })
            .eq("id", refund.vendor_id);
          if (rErr) throw rErr;
        }
        await recordAudit(supabase, "update_withdrawal", { id, updates, refund }, adminId);
        return json({ success: true });
      }
      case "list_manual_payments": {
        let q = supabase.from("manual_payments").select("*")
          .order("created_at", { ascending: false }).limit(100);
        if (params.filter === "pending") q = q.eq("status", "pending");
        const { data, error } = await q;
        if (error) throw error;
        return json({ payments: data ?? [] });
      }
      case "list_chat_conversations": {
        const { data, error } = await supabase
          .from("chat_conversations").select("*")
          .order("last_message_at", { ascending: false }).limit(200);
        if (error) throw error;
        return json({ conversations: data ?? [] });
      }
      case "list_chat_messages": {
        const { data, error } = await supabase
          .from("chat_messages").select("*")
          .eq("conversation_id", params.conversation_id)
          .order("created_at", { ascending: true }).limit(500);
        if (error) throw error;
        await supabase.from("chat_messages")
          .update({ is_read: true })
          .eq("conversation_id", params.conversation_id)
          .eq("sender_type", "user").eq("is_read", false);
        return json({ messages: data ?? [] });
      }
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
        const nextStatus = String(params.status || "");
        if (!Object.hasOwn(STATUS_LABELS, nextStatus)) {
          return json({ error: "Invalid transaction status" }, 400);
        }

        const { data: transaction, error: readError } = await supabase
          .from("transactions")
          .select("id, order_number, package_name, phone_number, status, activation_amount")
          .eq("id", params.id)
          .single();
        if (readError || !transaction) throw readError || new Error("Transaction not found");

        const patch: Record<string, unknown> = { status: nextStatus };
        if (nextStatus === "awaiting_activation") {
          const amt = Number(params.activation_amount);
          if (!Number.isFinite(amt) || amt < 1 || amt > 150000) {
            return json({ error: "Enter a valid activation amount between 1 and 150000" }, 400);
          }
          patch.activation_amount = Math.round(amt);
        }
        const { error } = await supabase.from("transactions").update(patch).eq("id", params.id);
        if (error) throw error;

        let sms: { sent: boolean; error?: string } = { sent: false };
        if (transaction.status !== nextStatus) {
          const smsResult = await sendOrderStatusSms(
            supabase,
            transaction,
            nextStatus,
            nextStatus === "awaiting_activation"
              ? Number(patch.activation_amount)
              : transaction.activation_amount,
          );
          sms = {
            sent: smsResult.ok,
            ...(smsResult.error ? { error: smsResult.error } : {}),
          };

          await supabase.from("sms_logs").insert({
            phone_number: transaction.phone_number,
            message: smsResult.message,
            status: smsResult.ok ? "sent" : "failed",
            transaction_id: transaction.id,
          });
        }

        await recordAudit(
          supabase,
          "update_transaction_status",
          { id: params.id, previous_status: transaction.status, status: nextStatus, sms },
          adminId,
        );
        return json({ success: true, sms });
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
      case "list_vendor_contacts": {
        const { data, error } = await supabase
          .from("vendors")
          .select("id, name, phone, created_at")
          .eq("status", "approved")
          .order("created_at", { ascending: false })
          .limit(500);
        if (error) throw error;
        return json({ contacts: (data ?? []).map((v: any) => ({ id: v.id, phone_number: v.phone, name: v.name, created_at: v.created_at })) });
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
        const audience = params.audience === "vendors" ? "vendors" : "all";
        let contacts: { phone_number: string }[] = [];
        if (audience === "vendors") {
          const { data, error } = await supabase.from("vendors").select("phone").eq("status", "approved");
          if (error) throw error;
          contacts = (data || []).map((v: any) => ({ phone_number: v.phone }));
        } else {
          const { data, error } = await supabase.from("broadcast_contacts").select("phone_number");
          if (error) throw error;
          contacts = data || [];
        }


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
      case "get_sms_balance": {
        const { data: rows } = await supabase.from("app_settings").select("key, value");
        const map: Record<string, string> = {};
        (rows || []).forEach((row: any) => { map[row.key] = row.value; });
        const otsApiKey = map.ots_api_key || Deno.env.get("OTS_API_KEY");
        if (!otsApiKey) throw new Error("OTS API key not configured. Set it in Settings → SMS Gateway first.");
        const res = await fetch("https://sms.ots.co.ke/api/v3/balance", {
          headers: { Authorization: `Bearer ${otsApiKey}`, Accept: "application/json" },
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || body?.status === "error") {
          throw new Error(body?.message || "Could not fetch SMS balance");
        }
        return json({
          balance: body?.data?.remaining_balance ?? null,
          fetched_at: new Date().toISOString(),
        });
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
      case "payout_all_vendors": {
        const accessToken = await requestDarajaToken();
        const shortcode = Deno.env.get("MPESA_SHORTCODE");
        const initiatorName = Deno.env.get("MPESA_INITIATOR_NAME");
        const securityCredential = Deno.env.get("MPESA_SECURITY_CREDENTIAL");
        const baseUrl = Deno.env.get("SUPABASE_URL");
        if (!shortcode || !initiatorName || !securityCredential || !baseUrl) {
          throw new Error("M-Pesa payout settings are not configured");
        }

        const { data: vendors, error: vErr } = await supabase
          .from("vendors")
          .select("id, name, phone, mpesa_payout, commission_balance, status")
          .eq("status", "approved");
        if (vErr) throw vErr;

        const eligible = (vendors || []).filter((v: any) => Math.floor(Number(v.commission_balance || 0)) >= 10);
        const results: any[] = [];

        for (const v of eligible) {
          const amount = Math.floor(Number(v.commission_balance));
          const payoutPhone = formatPhone(v.mpesa_payout || v.phone);

          // Atomic balance deduction — skip if balance moved meanwhile
          const { data: deducted } = await supabase
            .from("vendors")
            .update({ commission_balance: Number(v.commission_balance) - amount })
            .eq("id", v.id)
            .eq("commission_balance", v.commission_balance)
            .select("id");
          if (!deducted?.length) {
            results.push({ vendor: v.name, amount, status: "skipped", reason: "Balance changed" });
            continue;
          }

          const { data: withdrawal } = await supabase
            .from("withdrawals")
            .insert({ vendor_id: v.id, amount, phone: payoutPhone, status: "processing" })
            .select()
            .single();

          const refund = async (reason: string) => {
            await supabase.from("withdrawals")
              .update({ status: "failed", failure_reason: reason })
              .eq("id", withdrawal.id);
            const { data: cur } = await supabase
              .from("vendors").select("commission_balance").eq("id", v.id).single();
            await supabase.from("vendors")
              .update({ commission_balance: Number(cur?.commission_balance || 0) + amount })
              .eq("id", v.id);
          };

          try {
            const payload = {
              InitiatorName: initiatorName,
              SecurityCredential: securityCredential,
              CommandID: "BusinessPayment",
              Amount: amount,
              PartyA: shortcode,
              PartyB: payoutPhone,
              Remarks: "Vendor commission payout",
              QueueTimeOutURL: `${baseUrl}/functions/v1/vendor-api?action=b2c_timeout&withdrawal_id=${withdrawal.id}`,
              ResultURL: `${baseUrl}/functions/v1/vendor-api?action=b2c_result&withdrawal_id=${withdrawal.id}`,
              Occasion: "BulkVendorPayout",
            };

            const response = await fetch("https://api.safaricom.co.ke/mpesa/b2c/v1/paymentrequest", {
              method: "POST",
              headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (!response.ok || data?.ResponseCode !== "0") {
              const reason = data?.errorMessage || data?.ResponseDescription || "B2C request rejected";
              await refund(reason);
              results.push({ vendor: v.name, amount, status: "failed", reason });
              continue;
            }
            results.push({ vendor: v.name, amount, status: "processing" });
          } catch (e: any) {
            await refund(e?.message || "Unknown error");
            results.push({ vendor: v.name, amount, status: "failed", reason: e?.message });
          }
        }

        const paidTotal = results
          .filter((r) => r.status === "processing")
          .reduce((sum, r) => sum + r.amount, 0);

        await recordAudit(supabase, "payout_all_vendors", {
          created_at: new Date().toISOString(),
          count: results.filter((r) => r.status === "processing").length,
          total: paidTotal,
          results,
        }, adminId);

        return json({
          success: true,
          sent: results.filter((r) => r.status === "processing").length,
          failed: results.filter((r) => r.status === "failed").length,
          skipped: results.filter((r) => r.status === "skipped").length,
          total: paidTotal,
          results,
        });
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
