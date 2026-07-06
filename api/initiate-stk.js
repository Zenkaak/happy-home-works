// Vercel serverless function — M-Pesa STK push (ES module)
// PRIMARY path — called first by the frontend.
// Callback URL points to /api/stk-callback (this same Vercel project).
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
  if (!supabaseUrl || !supabaseKey) return {};
  try {
    const resp = await request(`${supabaseUrl}/rest/v1/app_settings?select=key,value`, {
      method: "GET",
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    });
    if (!Array.isArray(resp.body)) return {};
    const map = {};
    resp.body.forEach((row) => { if (row.key) map[row.key] = row.value; });
    return map;
  } catch { return {}; }
}

async function sendSms(phone254, message, otsApiKey) {
  if (!otsApiKey) return;
  const smsBody = JSON.stringify({ recipient: phone254, sender_id: "PROCALL", type: "plain", message });
  try {
    await request("https://sms.ots.co.ke/api/v3/sms/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${otsApiKey}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(smsBody),
        Accept: "application/json",
      },
    }, smsBody);
  } catch (e) {
    console.error("[initiate-stk] SMS error:", e.message);
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST")    { res.status(405).json({ error: "Method not allowed" }); return; }

  let body = {};
  try { body = await parseBody(req); } catch { /* ignore */ }

  const { phone, amount, transaction_id, account_ref, order_number, package_name } = body;

  if (!phone || !amount) {
    res.status(400).json({ ok: false, error: "Missing phone or amount" });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || "https://wxkvrdkbqkwkhbdunsvb.supabase.co";
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

  const settings = await fetchSettings(supabaseUrl, supabaseKey);

  const consumerKey     = settings.daraja_consumer_key    || process.env.DARAJA_CONSUMER_KEY;
  const consumerSecret  = settings.daraja_consumer_secret || process.env.DARAJA_CONSUMER_SECRET;
  const passkey         = settings.daraja_passkey         || process.env.DARAJA_PASSKEY;
  const shortcode       = settings.mpesa_shortcode        || process.env.MPESA_SHORTCODE;
  const transactionType = settings.transaction_type       || "CustomerPayBillOnline";
  const otsApiKey       = settings.ots_api_key            || process.env.OTS_API_KEY;

  if (!consumerKey || !consumerSecret || !passkey || !shortcode) {
    console.error("[initiate-stk] Missing Daraja credentials");
    res.status(500).json({ ok: false, error: "Daraja credentials not configured" });
    return;
  }

  let phone254 = String(phone).replace(/[^0-9]/g, "");
  if (phone254.startsWith("0") && phone254.length === 10) phone254 = `254${phone254.slice(1)}`;

  try {
    // 1. Daraja token
    const creds     = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    const tokenResp = await request(
      "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      { method: "GET", headers: { Authorization: `Basic ${creds}` } }
    );
    const accessToken = tokenResp.body?.access_token;
    if (!accessToken) {
      console.error("[initiate-stk] Token error:", JSON.stringify(tokenResp.body));
      res.status(502).json({ ok: false, error: "Failed to get Daraja token" });
      return;
    }

    // 2. Timestamp + password
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const ts  = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const password = Buffer.from(`${shortcode}${passkey}${ts}`).toString("base64");

    // 3. STK push — callback goes to Vercel /api/stk-callback
    const stkPayload = {
      BusinessShortCode: shortcode,
      Password:          password,
      Timestamp:         ts,
      TransactionType:   transactionType,
      Amount:            Math.ceil(Number(amount)),
      PartyA:            phone254,
      PartyB:            shortcode,
      PhoneNumber:       phone254,
      CallBackURL:       "https://hitechz.vercel.app/api/stk-callback",
      AccountReference:  (account_ref || "DASNET").slice(0, 12),
      TransactionDesc:   (account_ref || "DASNET Payment").slice(0, 13),
    };
    const stkBodyStr = JSON.stringify(stkPayload);
    const stkResp = await request(
      "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        method: "POST",
        headers: {
          Authorization:    `Bearer ${accessToken}`,
          "Content-Type":   "application/json",
          "Content-Length": Buffer.byteLength(stkBodyStr),
        },
      },
      stkBodyStr
    );
    const stkData = stkResp.body;
    console.log("[initiate-stk] Daraja response:", JSON.stringify(stkData));

    if (!stkData || stkData.ResponseCode !== "0") {
      const errMsg = stkData?.errorMessage || stkData?.CustomerMessage || stkData?.ResultDesc || "STK push failed";
      console.error("[initiate-stk] STK failed:", errMsg);
      res.status(200).json({ ok: false, error: errMsg });
      return;
    }

    // 4. Update transaction in Supabase
    if (transaction_id && supabaseKey) {
      const patchBodyStr = JSON.stringify({ stk_checkout_id: stkData.CheckoutRequestID, status: "processing", failure_reason: null });
      const patchResp = await request(
        `${supabaseUrl}/rest/v1/transactions?id=eq.${transaction_id}`,
        {
          method: "PATCH",
          headers: {
            apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json", "Content-Length": Buffer.byteLength(patchBodyStr),
            Prefer: "return=minimal",
          },
        },
        patchBodyStr
      );
      if (patchResp.status >= 400) console.error("[initiate-stk] Supabase patch failed:", patchResp.status);
    }

    // 5. "STK sent" SMS to customer (fire-and-forget)
    if (otsApiKey && order_number && package_name) {
      const amt = Number(amount).toLocaleString("en-KE");
      const msg = [
        `DASNET #${order_number}: Enter M-PESA PIN.`,
        `${package_name} | KSH ${amt}`,
        "Delivery is instant on confirmation.",
      ].join("\n");
      sendSms(phone254, msg, otsApiKey).catch(() => {});
    }

    res.status(200).json({ success: true, data: stkData });
  } catch (err) {
    console.error("[initiate-stk]", err);
    res.status(500).json({ ok: false, error: err.message || "Internal error" });
  }
}
