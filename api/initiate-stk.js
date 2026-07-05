// Vercel serverless function — M-Pesa STK push
// Uses built-in https module (no fetch) for compatibility with all Node versions.

const https = require("https");

/** Make an HTTPS request. Returns parsed JSON. */
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

/** Read + parse JSON body from request stream. */
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

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST")   { res.status(405).json({ error: "Method not allowed" }); return; }

  let body = {};
  try { body = await parseBody(req); } catch (e) { /* ignore */ }

  const { phone, amount, transaction_id, account_ref } = body;

  if (!phone || !amount) {
    res.status(400).json({ ok: false, error: "Missing phone or amount" });
    return;
  }

  const consumerKey    = process.env.DARAJA_CONSUMER_KEY;
  const consumerSecret = process.env.DARAJA_CONSUMER_SECRET;
  const passkey        = process.env.DARAJA_PASSKEY;
  const shortcode      = process.env.MPESA_SHORTCODE;
  const supabaseUrl    = process.env.SUPABASE_URL || "https://wxkvrdkbqkwkhbdunsvb.supabase.co";
  const supabaseKey    = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!consumerKey || !consumerSecret || !passkey || !shortcode) {
    res.status(500).json({ ok: false, error: "Daraja credentials not configured" });
    return;
  }

  // Normalise phone → 254XXXXXXXXX
  let phone254 = String(phone).replace(/[^0-9]/g, "");
  if (phone254.startsWith("0") && phone254.length === 10) {
    phone254 = "254" + phone254.slice(1);
  }

  try {
    // 1. Daraja token
    const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    const tokenResp = await request(
      "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      { method: "GET", headers: { Authorization: `Basic ${credentials}` } }
    );
    const accessToken = tokenResp.body && tokenResp.body.access_token;
    if (!accessToken) {
      res.status(502).json({ ok: false, error: "Failed to get Daraja token" });
      return;
    }

    // 2. Timestamp + password
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const ts =
      `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}` +
      `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const password = Buffer.from(`${shortcode}${passkey}${ts}`).toString("base64");

    // 3. STK push
    const stkPayload = {
      BusinessShortCode: shortcode,
      Password:          password,
      Timestamp:         ts,
      TransactionType:   "CustomerBuyGoodsOnline",
      Amount:            Math.ceil(Number(amount)),
      PartyA:            phone254,
      PartyB:            shortcode,
      PhoneNumber:       phone254,
      CallBackURL:       `${supabaseUrl}/functions/v1/initiate-stk/callback`,
      AccountReference:  (account_ref || "DASNET").slice(0, 12),
      TransactionDesc:   (account_ref || "DASNET Payment").slice(0, 13),
    };
    const stkBody = JSON.stringify(stkPayload);
    const stkResp = await request(
      "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        method: "POST",
        headers: {
          Authorization:  `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(stkBody),
        },
      },
      stkBody
    );
    const stkData = stkResp.body;

    if (!stkData || stkData.ResponseCode !== "0") {
      res.status(200).json({
        ok: false,
        error: (stkData && (stkData.errorMessage || stkData.CustomerMessage)) || "STK push failed",
      });
      return;
    }

    // 4. Update transaction in Supabase
    if (transaction_id && supabaseKey) {
      const patchBody = JSON.stringify({
        stk_checkout_id: stkData.CheckoutRequestID,
        status:          "processing",
        failure_reason:  null,
      });
      await request(
        `${supabaseUrl}/rest/v1/transactions?id=eq.${transaction_id}`,
        {
          method: "PATCH",
          headers: {
            apikey:           supabaseKey,
            Authorization:    `Bearer ${supabaseKey}`,
            "Content-Type":   "application/json",
            "Content-Length": Buffer.byteLength(patchBody),
            Prefer:           "return=minimal",
          },
        },
        patchBody
      );
    }

    res.status(200).json({ success: true, data: stkData });
  } catch (err) {
    console.error("[initiate-stk]", err);
    res.status(500).json({ ok: false, error: err.message || "Internal error" });
  }
};
