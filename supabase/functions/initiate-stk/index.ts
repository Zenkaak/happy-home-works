import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DARAJA_AUTH_URL =
  "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
const DARAJA_STK_URL =
  "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
const ADMIN_PHONE = "254751414437";

const createAdminClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

async function getDarajaToken(): Promise<string> {
  const consumerKey = Deno.env.get("DARAJA_CONSUMER_KEY")!;
  const consumerSecret = Deno.env.get("DARAJA_CONSUMER_SECRET")!;
  const credentials = base64Encode(`${consumerKey}:${consumerSecret}`);

  const res = await fetch(DARAJA_AUTH_URL, {
    method: "GET",
    headers: { Authorization: `Basic ${credentials}` },
  });

  const data = await res.json();
  if (!data.access_token) throw new Error("Failed to get Daraja access token");
  return data.access_token;
}

function getTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
    now.getDate()
  )}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function formatPhoneTo254(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    return `254${cleaned.slice(1)}`;
  }
  if (cleaned.startsWith("254") && cleaned.length === 12) {
    return cleaned;
  }
  return cleaned;
}

function formatDate(): string {
  return new Date().toLocaleString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Nairobi",
  });
}

function getServiceLabel(tx: any): string {
  if (tx.network) {
    const net = tx.network.charAt(0).toUpperCase() + tx.network.slice(1);
    return `${net} Data`;
  }
  if (tx.category === "kplc") return "KPLC Prepaid";
  if (tx.category === "loans") return "Loan Upgrade";
  return tx.category;
}

async function sendSms(message: string, phone: string, txId?: string) {
  const apiKey = Deno.env.get("AT_API_KEY");
  const username = Deno.env.get("AT_USERNAME");
  const senderId = Deno.env.get("AT_SENDER_ID");
  const supabase = createAdminClient();

  if (!apiKey || !username) {
    console.error("[SMS] Africa's Talking credentials not set");
    await supabase.from("sms_logs").insert({
      phone_number: phone,
      message,
      status: "failed_no_credentials",
      transaction_id: txId || null,
    });
    return;
  }

  try {
    const sendRequest = async (includeSenderId: boolean) => {
      const params = new URLSearchParams({
        username,
        to: "+" + formatPhoneTo254(phone),
        message,
      });
      if (includeSenderId && senderId) params.append("from", senderId);

      const url = username === "sandbox"
        ? "https://api.sandbox.africastalking.com/version1/messaging"
        : "https://api.africastalking.com/version1/messaging";

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          apiKey,
        },
        body: params.toString(),
      });

      return await res.json();
    };

    let result = await sendRequest(true);
    if (JSON.stringify(result).includes("InvalidSenderId")) {
      console.warn("[SMS] sender id rejected, retrying without sender id");
      result = await sendRequest(false);
    }

    const recipient = result?.SMSMessageData?.Recipients?.[0];
    const success = recipient?.status === "Success";
    console.log(`[SMS] To ${phone}: ${recipient?.status || "unknown"} — ${recipient?.statusCode || ""}`, result?.SMSMessageData?.Message);

    await supabase.from("sms_logs").insert({
      phone_number: phone,
      message,
      status: success ? "sent" : (recipient?.status || "failed"),
      transaction_id: txId || null,
    });
  } catch (error) {
    console.error("[SMS] send failed:", error);
    await supabase.from("sms_logs").insert({
      phone_number: phone,
      message,
      status: "error",
      transaction_id: txId || null,
    });
  }
}

async function sendSuccessSms(tx: any) {
  const service = getServiceLabel(tx);
  const date = formatDate();
  const orderNo = tx.order_number ? `#${tx.order_number}` : "";

  const userMsg = [
    `DASNET ORDER COMPLETED ${orderNo}`.trim(),
    `Service: ${service}`,
    `Package: ${tx.package_name}`,
    `Amount: KSH ${Number(tx.amount).toLocaleString()}`,
    tx.mpesa_reference ? `Ref: ${tx.mpesa_reference}` : null,
    `Time: ${date}`,
  ]
    .filter(Boolean)
    .join("\n");

  const adminMsg = [
    `[DASNET] ORDER COMPLETED ${orderNo}`.trim(),
    `Customer: ${tx.phone_number}`,
    `Service: ${service}`,
    `Package: ${tx.package_name}`,
    `Amount: KSH ${Number(tx.amount).toLocaleString()}`,
    tx.mpesa_reference ? `Ref: ${tx.mpesa_reference}` : null,
    `Time: ${date}`,
  ]
    .filter(Boolean)
    .join("\n");

  await sendSms(userMsg, tx.phone_number, tx.id);
  await sendSms(adminMsg, ADMIN_PHONE, tx.id);
}

async function sendFailureSms(tx: any) {
  const service = getServiceLabel(tx);
  const date = formatDate();
  const orderNo = tx.order_number ? `#${tx.order_number}` : "";
  const reason = tx.failure_reason || "Payment not completed";

  const userMsg = [
    `DASNET ORDER FAILED ${orderNo}`.trim(),
    `Service: ${service}`,
    `Package: ${tx.package_name}`,
    `Amount: KSH ${Number(tx.amount).toLocaleString()}`,
    `Reason: ${reason}`,
    ``,
    `To complete your purchase, send KSH ${Number(tx.amount).toLocaleString()} via M-PESA:`,
    `Lipa na M-PESA > Buy Goods`,
    `Till: 8448104 (Dasnet Ventures)`,
    `Then reply with the M-PESA code.`,
  ].join("\n");

  const adminMsg = [
    `[DASNET] ORDER FAILED ${orderNo}`.trim(),
    `Customer: ${tx.phone_number}`,
    `Service: ${service}`,
    `Package: ${tx.package_name}`,
    `Amount: KSH ${Number(tx.amount).toLocaleString()}`,
    `Reason: ${reason}`,
    `Time: ${date}`,
  ].join("\n");

  await sendSms(userMsg, tx.phone_number, tx.id);
  await sendSms(adminMsg, ADMIN_PHONE, tx.id);
}

async function sendInitiatedSms(tx: any) {
  const service = getServiceLabel(tx);
  const date = formatDate();
  const orderNo = tx.order_number ? `#${tx.order_number}` : "";

  const userMsg = [
    `DASNET PAYMENT STARTED ${orderNo}`.trim(),
    `Service: ${service}`,
    `Package: ${tx.package_name}`,
    `Amount: KSH ${Number(tx.amount).toLocaleString()}`,
    `Time: ${date}`,
    `Complete the M-PESA prompt on your phone.`,
  ]
    .filter(Boolean)
    .join("\n");

  const adminMsg = [
    `[DASNET] PAYMENT STARTED ${orderNo}`.trim(),
    `Customer: ${tx.phone_number}`,
    `Service: ${service}`,
    `Package: ${tx.package_name}`,
    `Amount: KSH ${Number(tx.amount).toLocaleString()}`,
    `Time: ${date}`,
  ]
    .filter(Boolean)
    .join("\n");

  await sendSms(userMsg, tx.phone_number, tx.id);
  await sendSms(adminMsg, ADMIN_PHONE, tx.id);
}

// Map raw Daraja STK ResultCodes to clear, customer-facing reasons.
// Codes from Safaricom Daraja docs + observed in production.
function friendlyStkReason(code: number | string, rawDesc: string): string {
  const c = String(code);
  const map: Record<string, string> = {
    "1": "Insufficient M-PESA balance. Top up and try again.",
    "1001": "Another M-PESA request is already in progress. Wait 30s and retry.",
    "1019": "Transaction expired. Please try again.",
    "1025": "M-PESA system busy. Please try again in a moment.",
    "1031": "Request cancelled — you pressed Cancel on the STK prompt.",
    "1032": "You cancelled the request on your phone.",
    "1037": "STK timed out — no PIN entered. Please try again.",
    "2001": "Wrong M-PESA PIN entered.",
    "9999": "M-PESA error. Please try again.",
    "17": "M-PESA system internal error. Please retry.",
    "26": "System busy at Safaricom. Please retry shortly.",
  };
  if (map[c]) return map[c];
  // Catch the generic "unresolved reason" Safaricom returns for blacklisted SIMs / blocked STK
  if (/unresolved reason/i.test(rawDesc)) {
    return "Safaricom blocked this STK push (often a blacklisted or restricted SIM). Use Pay Manually via Till 8448104.";
  }
  if (/cancel/i.test(rawDesc)) return "You cancelled the M-PESA prompt.";
  if (/timeout|no response/i.test(rawDesc)) return "No response — STK prompt timed out. Please try again.";
  if (/insufficient/i.test(rawDesc)) return "Insufficient M-PESA balance.";
  return rawDesc;
}

async function handleCallback(req: Request) {
  try {
    const body = await req.json();
    const stkCallback = body.Body?.stkCallback;

    if (!stkCallback) {
      return new Response("Invalid callback", { status: 400, headers: corsHeaders });
    }

    const checkoutRequestId = stkCallback.CheckoutRequestID;
    const resultCode = stkCallback.ResultCode;
    const rawDesc = stkCallback.ResultDesc || "Payment failed";
    const resultDesc = friendlyStkReason(resultCode, rawDesc);
    const supabase = createAdminClient();

    const { data: tx, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .eq("stk_checkout_id", checkoutRequestId)
      .maybeSingle();

    if (txError) throw txError;

    if (!tx) {
      console.error("Transaction not found for checkout:", checkoutRequestId);
      return new Response("OK", { headers: corsHeaders });
    }

    if (tx.status === "completed" || tx.status === "failed") {
      return new Response("OK", { headers: corsHeaders });
    }

    if (resultCode === 0 || resultCode === "0") {
      const callbackMetadata = stkCallback.CallbackMetadata?.Item || [];
      const getValue = (name: string) =>
        callbackMetadata.find((item: any) => item.Name === name)?.Value;

      const updatedTx = {
        ...tx,
        status: "completed",
        mpesa_reference: getValue("MpesaReceiptNumber") || tx.mpesa_reference,
        kplc_token:
          tx.category === "kplc" && !tx.kplc_token
            ? Array.from({ length: 16 }, () => Math.floor(Math.random() * 10)).join("")
            : tx.kplc_token,
        failure_reason: null,
      };

      const { error: updateError } = await supabase
        .from("transactions")
        .update({
          status: updatedTx.status,
          mpesa_reference: updatedTx.mpesa_reference,
          kplc_token: updatedTx.kplc_token,
          failure_reason: null,
        })
        .eq("id", tx.id);

      if (updateError) throw updateError;

      await sendSuccessSms(updatedTx);
      return new Response("OK", { headers: corsHeaders });
    }

    const failedTx = {
      ...tx,
      status: "failed",
      failure_reason: resultDesc,
    };

    const { error: updateError } = await supabase
      .from("transactions")
      .update({
        status: "failed",
        failure_reason: resultDesc,
      })
      .eq("id", tx.id);

    if (updateError) throw updateError;

    await sendFailureSms(failedTx);
    return new Response("OK", { headers: corsHeaders });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Callback error:", msg);
    return new Response("Internal Server Error", { status: 500, headers: corsHeaders });
  }
}

async function handleInitiate(req: Request) {
  try {
    const consumerKey = Deno.env.get("DARAJA_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("DARAJA_CONSUMER_SECRET");
    const passkey = Deno.env.get("DARAJA_PASSKEY");
    const shortcode = Deno.env.get("MPESA_SHORTCODE");
    const projectUrl = Deno.env.get("SUPABASE_URL");

    if (!consumerKey || !consumerSecret || !passkey || !shortcode || !projectUrl) {
      throw new Error("Daraja credentials not configured");
    }

    const { phone, amount, transaction_id, account_ref } = await req.json();

    if (!phone || !amount || !transaction_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formattedPhone = formatPhoneTo254(phone);
    const supabase = createAdminClient();

    // Banned check
    const { data: isBanned } = await supabase.rpc("is_banned", { p_phone: formattedPhone });
    if (isBanned) {
      return new Response(JSON.stringify({ error: "This number is not permitted. Contact support." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit (max 3 STK per phone per 5 min)
    const { data: rateAllowed } = await supabase.rpc("check_stk_rate_limit", { p_phone: formattedPhone });
    if (rateAllowed === false) {
      return new Response(JSON.stringify({ error: "Too many payment attempts. Please wait 5 minutes before trying again." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const timestamp = getTimestamp();
    const password = base64Encode(`${shortcode}${passkey}${timestamp}`);
    const accessToken = await getDarajaToken();

    const stkPayload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Number(amount),
      PartyA: formattedPhone,
      PartyB: shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: `${projectUrl}/functions/v1/initiate-stk/callback`,
      AccountReference: account_ref || "DASNET",
      TransactionDesc: account_ref || "DASNET Payment",
    };

    const stkResponse = await fetch(DARAJA_STK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(stkPayload),
    });

    const stkData = await stkResponse.json();

    if (stkData.ResponseCode !== "0") {
      const errorMsg =
        stkData.errorMessage || stkData.CustomerMessage || "STK push failed";

      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: updatedTx, error: updateError } = await supabase
      .from("transactions")
      .update({
        stk_checkout_id: stkData.CheckoutRequestID,
        status: "processing",
        failure_reason: null,
      })
      .eq("id", transaction_id)
      .select("*")
      .single();

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true, data: stkData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { pathname } = new URL(req.url);
  if (pathname.endsWith("/callback")) {
    return handleCallback(req);
  }

  return handleInitiate(req);
});