// Vercel — Safaricom STK callback handler (ES module)
// IMPORTANT: Do ALL work (DB update, SMS) BEFORE calling res.json().
// Vercel terminates the function immediately after res.json() — nothing after it runs.
import https from "https";

function request(url, options, body, timeoutMs = 6000) {
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
    // Hard abort to stay well inside Vercel's 10s function limit
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Request timed out after ${timeoutMs}ms: ${url}`));
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

// ── Auto B2C payout — mirrors the logic in supabase/functions/initiate-stk ──
async function autoPayoutToAdmin(tx, settings) {
  // Honour the toggle — default to enabled if the key is absent
  if (settings.auto_payout_enabled === "false") {
    console.log("[auto-b2c] disabled by settings, skipping");
    return;
  }

  const adminPhone        = settings.admin_payout_phone        || process.env.ADMIN_PAYOUT_PHONE;
  const initiatorName     = settings.mpesa_initiator_name      || process.env.MPESA_INITIATOR_NAME;
  const securityCred      = settings.mpesa_security_credential || process.env.MPESA_SECURITY_CREDENTIAL;
  const shortcode         = settings.mpesa_shortcode            || process.env.MPESA_SHORTCODE;
  const consumerKey       = settings.daraja_consumer_key        || process.env.DARAJA_CONSUMER_KEY;
  const consumerSecret    = settings.daraja_consumer_secret     || process.env.DARAJA_CONSUMER_SECRET;
  const supabaseUrl       = process.env.SUPABASE_URL            || "https://wxkvrdkbqkwkhbdunsvb.supabase.co";

  const orderAmount = Math.floor(Number(tx.amount));
  // Deduct KSH 10 as a processing fee on orders over KSH 100; send full amount otherwise
  const payoutAmount = orderAmount <= 100 ? orderAmount : orderAmount - 10;

  if (!adminPhone || !initiatorName || !securityCred || !shortcode || !consumerKey || !consumerSecret) {
    console.warn("[auto-b2c] missing credentials, skipping");
    return;
  }
  if (!payoutAmount || payoutAmount < 10) {
    console.warn("[auto-b2c] amount too small, skipping");
    return;
  }

  // 1. Get Daraja access token
  const creds = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const tokenResp = await request(
    "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    { method: "GET", headers: { Authorization: `Basic ${creds}` } }
  );
  const accessToken = tokenResp.body?.access_token;
  if (!accessToken) {
    console.error("[auto-b2c] could not get Daraja token:", JSON.stringify(tokenResp.body));
    return;
  }

  // 2. Fire B2C payment request
  const occasion = `ORD${tx.order_number || ""}`.slice(0, 100);
  const remarks  = `Order #${tx.order_number || ""} ${tx.package_name || ""}`.slice(0, 100);
  const b2cPayload = {
    InitiatorName:      initiatorName,
    SecurityCredential: securityCred,
    CommandID:          "BusinessPayment",
    Amount:             payoutAmount,
    PartyA:             shortcode,
    PartyB:             formatPhone(adminPhone),
    Remarks:            remarks,
    QueueTimeOutURL:    `${supabaseUrl}/functions/v1/admin-api?action=admin_b2c_timeout`,
    ResultURL:          `${supabaseUrl}/functions/v1/admin-api?action=admin_b2c_result`,
    Occasion:           occasion,
  };
  const b2cBodyStr = JSON.stringify(b2cPayload);
  const b2cResp = await request(
    "https://api.safaricom.co.ke/mpesa/b2c/v1/paymentrequest",
    {
      method: "POST",
      headers: {
        Authorization:    `Bearer ${accessToken}`,
        "Content-Type":   "application/json",
        "Content-Length": Buffer.byteLength(b2cBodyStr),
      },
    },
    b2cBodyStr
  );

  if (b2cResp.status < 200 || b2cResp.status >= 300 || b2cResp.body?.ResponseCode !== "0") {
    console.error("[auto-b2c] B2C request failed (HTTP %d):", b2cResp.status,
      b2cResp.body?.errorMessage || b2cResp.body?.ResponseDescription || b2cResp.body);
    return;
  }

  console.log(`[auto-b2c] initiated KSH ${payoutAmount} → ${adminPhone} | ConvID=${b2cResp.body?.ConversationID}`);
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
  if (/cancel/i.test(rawDesc))             return "You cancelled the request on your phone.";
  if (/timeout|no response/i.test(rawDesc)) return "STK timed out — no PIN entered.";
  if (/insufficient/i.test(rawDesc))       return "Insufficient M-PESA balance.";
  if (/wrong pin/i.test(rawDesc))          return "Wrong M-PESA PIN entered.";
  return rawDesc || "Payment not completed.";
}

async function sendSms(phone, message, otsApiKey) {
  if (!otsApiKey) return;
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
    console.log(`[SMS] To ${phone254}: ${r.status}`);
  } catch (e) {
    console.error("[SMS] Error:", e.message);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(200).end(); return; }

  const supabaseUrl = process.env.SUPABASE_URL || "https://wxkvrdkbqkwkhbdunsvb.supabase.co";
  // Prefer the service role key for callback writes — it bypasses RLS so the
  // PATCH always succeeds regardless of row-level security policies.
  // Falls back to the anon/publishable key if service role is not configured.
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;

  let body = {};
  try { body = await parseBody(req); } catch { /* ignore */ }

  const stkCallback = body?.Body?.stkCallback;
  if (!stkCallback) {
    // Not a valid STK callback — respond immediately
    res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
    return;
  }

  const checkoutId = stkCallback.CheckoutRequestID;
  const resultCode = stkCallback.ResultCode;
  const rawDesc    = stkCallback.ResultDesc || "Payment not completed";

  console.log(`[callback] CheckoutID=${checkoutId} ResultCode=${resultCode}`);

  if (!supabaseKey) {
    console.error("[callback] Missing supabaseKey");
    res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
    return;
  }

  try {
    // Fetch settings and transaction in PARALLEL for speed
    const [settings, tx] = await Promise.all([
      fetchSettings(supabaseUrl, supabaseKey),
      supabaseGet(supabaseUrl, supabaseKey, checkoutId),
    ]);

    if (!tx) {
      console.error("[callback] Transaction not found for", checkoutId);
      res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
      return;
    }

    if (tx.status === "completed" || tx.status === "failed") {
      console.log("[callback] Already processed:", tx.status);
      res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
      return;
    }

    const otsApiKey  = settings.ots_api_key || process.env.OTS_API_KEY;
    const adminPhone = settings.admin_notify_phone || null;

    if (String(resultCode) === "0") {
      // ── SUCCESS ──
      const items = stkCallback.CallbackMetadata?.Item || [];
      const getValue = (name) => items.find((i) => i.Name === name)?.Value;
      const mpesaRef = getValue("MpesaReceiptNumber") || tx.mpesa_reference || "";

      // Update DB
      await supabasePatch(supabaseUrl, supabaseKey, tx.id, {
        status: "completed",
        mpesa_reference: mpesaRef,
        failure_reason: null,
      });

      // Success SMS to customer
      const orderNo = tx.order_number ? ` #${tx.order_number}` : "";
      const amount  = Number(tx.amount).toLocaleString("en-KE");
      const pkg     = tx.package_name || "Service";
      const successMsg = [
        `DASNET${orderNo} Delivered ✓`,
        `${pkg} | KSH ${amount}`,
        mpesaRef ? `M-Pesa: ${mpesaRef}` : null,
        "DASNET VENTURES LTD",
      ].filter(Boolean).join("\n");

      // Send customer + admin SMS in parallel, then trigger auto B2C payout
      await Promise.all([
        sendSms(tx.phone_number, successMsg, otsApiKey),
        adminPhone
          ? sendSms(adminPhone, `Order completed${orderNo} KSH ${amount}`, otsApiKey)
          : Promise.resolve(),
      ]);

      // Auto B2C — must finish BEFORE res.json() or Vercel will terminate the function
      try {
        await autoPayoutToAdmin(tx, settings);
      } catch (b2cErr) {
        console.error("[auto-b2c] unhandled error:", b2cErr.message);
      }
    } else {
      // ── FAILURE ──
      const reason = friendlyReason(resultCode, rawDesc);

      // Update DB
      await supabasePatch(supabaseUrl, supabaseKey, tx.id, {
        status: "failed",
        failure_reason: reason,
      });

      // Failure SMS to customer
      const orderNo  = tx.order_number ? ` #${tx.order_number}` : "";
      const amount   = Number(tx.amount).toLocaleString("en-KE");
      const pkg      = tx.package_name || "Service";
      const failureMsg = [
        `DASNET${orderNo} Failed`,
        `${pkg} | KSH ${amount}`,
        reason,
        "No charge. Retry: hitechz.vercel.app",
      ].join("\n");

      await sendSms(tx.phone_number, failureMsg, otsApiKey);
    }
  } catch (e) {
    console.error("[callback] Error:", e.message);
  }

  // ── ALWAYS respond to Safaricom LAST, after all work is done ──
  // Responding earlier terminates the Vercel function immediately.
  res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
}
