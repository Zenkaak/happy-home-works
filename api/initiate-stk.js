// Vercel serverless function — M-Pesa STK push (ES module)
// PRIMARY path. Fetches Daraja token and sends STK push.
// Returns { success, checkoutId } immediately — DB update is handled by the frontend.
// Callback URL → /api/stk-callback (handles completion + SMS).
import https from "https";

function request(url, options, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: options.method || "GET",
        headers: options.headers || {},
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, body: data }); }
        });
      }
    );
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

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST")    { res.status(405).json({ error: "Method not allowed" }); return; }

  let body = {};
  try { body = await parseBody(req); } catch { /* ignore */ }

  const { phone, amount, account_ref } = body;

  if (!phone || !amount) {
    res.status(400).json({ ok: false, error: "Missing phone or amount" });
    return;
  }

  // Daraja credentials come from env vars — no Supabase call needed here
  const consumerKey    = process.env.DARAJA_CONSUMER_KEY;
  const consumerSecret = process.env.DARAJA_CONSUMER_SECRET;
  const passkey        = process.env.DARAJA_PASSKEY;
  const shortcode      = process.env.MPESA_SHORTCODE;

  if (!consumerKey || !consumerSecret || !passkey || !shortcode) {
    console.error("[initiate-stk] Missing Daraja env vars");
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

    // 3. STK push — callback → /api/stk-callback
    const stkPayload = {
      BusinessShortCode: shortcode,
      Password:          password,
      Timestamp:         ts,
      TransactionType:   "CustomerPayBillOnline",
      Amount:            Math.ceil(Number(amount)),
      PartyA:            phone254,
      PartyB:            shortcode,
      PhoneNumber:       phone254,
      CallBackURL:       "https://hitechz.vercel.app/api/stk-callback",
      AccountReference:  (account_ref || "DASNET").slice(0, 12),
      TransactionDesc:   (account_ref || "DASNET").slice(0, 13),
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
    console.log("[initiate-stk] Daraja:", stkData?.ResponseCode, stkData?.ResponseDescription);

    if (!stkData || stkData.ResponseCode !== "0") {
      const errMsg =
        stkData?.errorMessage ||
        stkData?.CustomerMessage ||
        stkData?.ResultDesc ||
        "STK push failed";
      res.status(200).json({ ok: false, error: errMsg });
      return;
    }

    // 4. Respond immediately — frontend will update stk_checkout_id in Supabase
    res.status(200).json({
      success:    true,
      checkoutId: stkData.CheckoutRequestID,
      data:       stkData,
    });
  } catch (err) {
    console.error("[initiate-stk]", err.message);
    res.status(500).json({ ok: false, error: err.message || "Internal error" });
  }
}
