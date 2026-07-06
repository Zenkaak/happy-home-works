// Vercel — Safaricom STK callback handler (ES module)
// Safaricom POSTs here after the customer completes or cancels the M-PESA prompt.
import https from "https";

function request(url, options, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: options.method || "GET",
      headers: options.headers || {},
    };
    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on("error", reject);
    if (body) req.write(typeof body === "string" ? body : JSON.stringify(body));
    req.end();
  });
}

function parseBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try { resolve(JSON.parse(data)); }
      catch { resolve({}); }
    });
  });
}

async function fetchSettings(supabaseUrl, supabaseKey) {
  try {
    const r = await request(`${supabaseUrl}/rest/v1/app_settings?select=key,value`, {
      method: "GET",
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    });
    if (!Array.isArray(r.body)) return {};
    const map = {};
    r.body.forEach((row) => { if (row.key) map[row.key] = row.value; });
    return map;
  } catch { return {}; }
}

async function supabasePatch(supabaseUrl, supabaseKey, id, updates) {
  const bodyStr = JSON.stringify(updates);
  return request(`${supabaseUrl}/rest/v1/transactions?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(bodyStr),
      Prefer: "return=representation",
    },
  }, bodyStr);
}

async function supabaseGet(supabaseUrl, supabaseKey, checkoutId) {
  const r = await request(
    `${supabaseUrl}/rest/v1/transactions?stk_checkout_id=eq.${encodeURIComponent(checkoutId)}&select=*&limit=1`,
    {
      method: "GET",
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    }
  );
  return Array.isArray(r.body) ? r.body[0] : null;
}

function formatPhone(phone) {
  const c = String(phone || "").replace(/[^0-9]/g, "");
  if (c.startsWith("0") && c.length === 10) return `254${c.slice(1)}`;
  if (c.startsWith("254") && c.length === 12) return c;
  return c;
}

function friendlyReason(code, rawDesc) {
  const c = String(code);
  const map = {
    "1":    "Insufficient M-PESA balance.",
    "1031": "You cancelled the request on your phone.",
    "1032": "You cancelled the request on your phone.",
    "1037": "STK timed out — no PIN entered.",
    "2001": "Wrong M-PESA PIN entered.",
    "1019": "Transaction expired.",
    "1025": "M-PESA system busy. Please retry.",
    "17":   "M-PESA internal error. Please retry.",
    "26":   "Safaricom system busy. Please retry.",
  };
  if (map[c]) return map[c];
  if (/cancel/i.test(rawDesc))       return "You cancelled the request on your phone.";
  if (/timeout|no response/i.test(rawDesc)) return "STK timed out — no PIN entered.";
  if (/insufficient/i.test(rawDesc)) return "Insufficient M-PESA balance.";
  if (/wrong pin/i.test(rawDesc))    return "Wrong M-PESA PIN entered.";
  return rawDesc || "Payment not completed.";
}

async function sendSms(phone, message, otsApiKey) {
  if (!otsApiKey) { console.warn("[SMS] No OTS API key"); return; }
  const phone254 = formatPhone(phone);
  const bodyStr = JSON.stringify({ recipient: phone254, sender_id: "PROCALL", type: "plain", message });
  try {
    const r = await request("https://sms.ots.co.ke/api/v3/sms/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${otsApiKey}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(bodyStr),
        Accept: "application/json",
      },
    }, bodyStr);
    console.log(`[SMS] To ${phone254}: ${r.status}`, JSON.stringify(r.body).slice(0, 120));
  } catch (e) {
    console.error("[SMS] Error:", e.message);
  }
}

async function autoPayout(tx, settings, otsApiKey) {
  const adminPhone = settings.admin_payout_phone;
  if (!adminPhone || settings.auto_payout_enabled === "false") return;

  const consumerKey    = settings.daraja_consumer_key    || process.env.DARAJA_CONSUMER_KEY;
  const consumerSecret = settings.daraja_consumer_secret || process.env.DARAJA_CONSUMER_SECRET;
  const shortcode      = settings.mpesa_shortcode        || process.env.MPESA_SHORTCODE;
  const initiator      = settings.mpesa_initiator_name   || process.env.MPESA_INITIATOR_NAME;
  const secCred        = settings.mpesa_security_credential || process.env.MPESA_SECURITY_CREDENTIAL;
  const supabaseUrl    = process.env.SUPABASE_URL || "https://wxkvrdkbqkwkhbdunsvb.supabase.co";

  if (!consumerKey || !consumerSecret || !shortcode || !initiator || !secCred) {
    console.warn("[B2C] Missing credentials, skipping payout");
    return;
  }

  const orderAmount = Math.floor(Number(tx.amount));
  const amount = orderAmount <= 100 ? orderAmount : orderAmount - 10;
  if (amount < 10) return;

  try {
    const creds = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    const tokenR = await request(
      "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      { method: "GET", headers: { Authorization: `Basic ${creds}` } }
    );
    const token = tokenR.body?.access_token;
    if (!token) { console.error("[B2C] No token"); return; }

    const payload = {
      InitiatorName: initiator,
      SecurityCredential: secCred,
      CommandID: "BusinessPayment",
      Amount: amount,
      PartyA: shortcode,
      PartyB: formatPhone(adminPhone),
      Remarks: `Order #${tx.order_number}`.slice(0, 100),
      QueueTimeOutURL: `${supabaseUrl}/functions/v1/admin-api?action=admin_b2c_timeout`,
      ResultURL:       `${supabaseUrl}/functions/v1/admin-api?action=admin_b2c_result`,
      Occasion: `ORD${tx.order_number}`,
    };
    const bodyStr = JSON.stringify(payload);
    const r = await request("https://api.safaricom.co.ke/mpesa/b2c/v1/paymentrequest", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(bodyStr),
      },
    }, bodyStr);
    console.log("[B2C] Response:", r.status, JSON.stringify(r.body).slice(0, 120));
  } catch (e) {
    console.error("[B2C] Error:", e.message);
  }
}

export default async function handler(req, res) {
  // Safaricom only POSTs callbacks; no auth header needed
  if (req.method !== "POST") { res.status(200).end(); return; }

  const supabaseUrl = process.env.SUPABASE_URL || "https://wxkvrdkbqkwkhbdunsvb.supabase.co";
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

  let body = {};
  try { body = await parseBody(req); } catch { /* ignore */ }

  const stkCallback = body?.Body?.stkCallback;
  if (!stkCallback) { res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" }); return; }

  const checkoutId = stkCallback.CheckoutRequestID;
  const resultCode = stkCallback.ResultCode;
  const rawDesc    = stkCallback.ResultDesc || "Payment not completed";

  console.log(`[callback] CheckoutID=${checkoutId} ResultCode=${resultCode}`);

  // Always respond immediately to Safaricom
  res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });

  if (!supabaseKey) { console.error("[callback] Missing supabaseKey"); return; }

  try {
    const settings   = await fetchSettings(supabaseUrl, supabaseKey);
    const otsApiKey  = settings.ots_api_key || process.env.OTS_API_KEY;
    const adminPhone = settings.admin_notify_phone || null;

    const tx = await supabaseGet(supabaseUrl, supabaseKey, checkoutId);
    if (!tx) { console.error("[callback] Transaction not found for", checkoutId); return; }
    if (tx.status === "completed" || tx.status === "failed") {
      console.log("[callback] Already processed:", tx.status);
      return;
    }

    if (String(resultCode) === "0") {
      // ── Success ──
      const items = stkCallback.CallbackMetadata?.Item || [];
      const getValue = (name) => items.find((i) => i.Name === name)?.Value;
      const mpesaRef = getValue("MpesaReceiptNumber") || tx.mpesa_reference || "";

      const kplcToken = tx.category === "kplc" && !tx.kplc_token
        ? Array.from({ length: 16 }, () => Math.floor(Math.random() * 10)).join("")
        : tx.kplc_token;

      const patchR = await supabasePatch(supabaseUrl, supabaseKey, tx.id, {
        status: "completed",
        mpesa_reference: mpesaRef,
        kplc_token: kplcToken,
        failure_reason: null,
      });
      const updatedTx = Array.isArray(patchR.body) ? patchR.body[0] : { ...tx, mpesa_reference: mpesaRef, kplc_token: kplcToken };

      // Success SMS to customer
      const orderNo  = tx.order_number ? ` #${tx.order_number}` : "";
      const amount   = Number(tx.amount).toLocaleString("en-KE");
      const successLines = [
        `DASNET${orderNo} Delivered ✓`,
        `${tx.package_name} | KSH ${amount}`,
        mpesaRef ? `M-Pesa: ${mpesaRef}` : null,
        tx.category === "kplc" && tx.meter_number ? `Meter: ${tx.meter_number}` : null,
        tx.category === "kplc" && kplcToken       ? `Token: ${kplcToken}` : null,
        "DASNET VENTURES LTD",
      ].filter(Boolean);
      await sendSms(tx.phone_number, successLines.join("\n"), otsApiKey);

      // Admin notification SMS
      if (adminPhone) {
        await sendSms(adminPhone, `Order completed${orderNo} KSH ${amount}`, otsApiKey);
      }

      // Auto B2C payout (fire-and-forget)
      autoPayout(updatedTx || tx, settings, otsApiKey).catch((e) =>
        console.error("[callback] Payout error:", e.message)
      );
    } else {
      // ── Failure ──
      const reason = friendlyReason(resultCode, rawDesc);

      await supabasePatch(supabaseUrl, supabaseKey, tx.id, {
        status: "failed",
        failure_reason: reason,
      });

      const orderNo = tx.order_number ? ` #${tx.order_number}` : "";
      const amount  = Number(tx.amount).toLocaleString("en-KE");
      const failureLines = [
        `DASNET${orderNo} Failed`,
        `${tx.package_name} | KSH ${amount}`,
        reason,
        "No charge. Retry: hitechz.vercel.app",
      ];
      await sendSms(tx.phone_number, failureLines.join("\n"), otsApiKey);
    }
  } catch (e) {
    console.error("[callback] Error:", e.message);
  }
}
