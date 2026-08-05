// Vercel serverless function — M-Pesa STK push (ES module)
// Daraja credentials come ONLY from Vercel env vars — no Supabase DB lookup.
// Daraja access token is cached at module level — valid 1h, reused on warm instances.
// Callback URL → /api/stk-callback.
import https from "https";

// ── Module-level token cache (persists across warm Lambda re-uses) ──────────
let _cachedToken = null;
let _tokenExpiry = 0;

function requestWithTimeout(url, options, body, timeoutMs = 8000) {
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
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Daraja connection exceeded ${timeoutMs}ms limit — Safaricom unreachable`));
    });
    req.on("error", reject);
    if (body) req.write(typeof body === "string" ? body : JSON.stringify(body));
    req.end();
  });
}

async function getDarajaToken(consumerKey, consumerSecret) {
  const now = Date.now();
  if (_cachedToken && now < _tokenExpiry) {
    console.log("[initiate-stk] token: cached ✓");
    return _cachedToken;
  }
  console.log("[initiate-stk] token: fetching…");
  const creds = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const resp = await requestWithTimeout(
    "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    { method: "GET", headers: { Authorization: `Basic ${creds}` } },
    null,
    6000
  );
  const token = resp.body?.access_token;
  if (!token) throw new Error(`Daraja token error: ${JSON.stringify(resp.body)}`);
  _cachedToken = token;
  _tokenExpiry = now + 55 * 60 * 1000;
  console.log("[initiate-stk] token: fetched and cached");
  return token;
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

  // Supabase anon key — used for SECURITY DEFINER RPCs only (no service_role needed).
  // Falls back to VITE_-prefixed variant which Vercel sets for the React build.
  const supabaseUrl = process.env.SUPABASE_URL || "https://wxkvrdkbqkwkhbdunsvb.supabase.co";
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  // GET → pre-warm: fetch and cache the Daraja token so the next POST is instant.
  if (req.method === "GET") {
    const ck = process.env.DARAJA_CONSUMER_KEY;
    const cs = process.env.DARAJA_CONSUMER_SECRET;
    if (ck && cs) getDarajaToken(ck, cs).catch(() => {});
    res.status(200).json({ ok: true, warm: true });
    return;
  }

  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  let body = {};
  try { body = await parseBody(req); } catch { /* ignore */ }

  const { phone, amount, account_ref, transaction_id } = body;

  if (!phone || !amount) {
    res.status(400).json({ ok: false, error: "Missing phone or amount" });
    return;
  }

  // All Daraja credentials come exclusively from Vercel env vars.
  // No DB lookup — the app_settings RLS only exposes service toggle keys anyway.
  const consumerKey     = process.env.DARAJA_CONSUMER_KEY;
  const consumerSecret  = process.env.DARAJA_CONSUMER_SECRET;
  const passkey         = process.env.DARAJA_PASSKEY;
  const shortcode       = process.env.MPESA_SHORTCODE;
  const transactionType = process.env.DARAJA_TRANSACTION_TYPE || "CustomerPayBillOnline";

  if (!consumerKey || !consumerSecret || !passkey || !shortcode) {
    console.error("[initiate-stk] missing Daraja credentials in Vercel env");
    res.status(500).json({ ok: false, error: "Daraja credentials not configured" });
    return;
  }

  let phone254 = String(phone).replace(/[^0-9]/g, "");
  if (phone254.startsWith("0") && phone254.length === 10) phone254 = `254${phone254.slice(1)}`;

  const t0 = Date.now();

  try {
    const accessToken = await getDarajaToken(consumerKey, consumerSecret);

    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const ts  = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const password = Buffer.from(`${shortcode}${passkey}${ts}`).toString("base64");

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
      TransactionDesc:   (account_ref || "DASNET").slice(0, 13),
    };
    const stkBodyStr = JSON.stringify(stkPayload);
    const stkResp = await requestWithTimeout(
      "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        method: "POST",
        headers: {
          Authorization:    `Bearer ${accessToken}`,
          "Content-Type":   "application/json",
          "Content-Length": Buffer.byteLength(stkBodyStr),
        },
      },
      stkBodyStr,
      8000
    );
    const stkData = stkResp.body;
    console.log(`[initiate-stk] done in ${Date.now()-t0}ms — code:${stkData?.ResponseCode}`);

    if (!stkData || stkData.ResponseCode !== "0") {
      if (stkData?.errorCode === "400.002.02" || /invalid.*token|expired/i.test(stkData?.errorMessage || "")) {
        _cachedToken = null;
        _tokenExpiry = 0;
      }
      const errMsg =
        stkData?.errorMessage ||
        stkData?.CustomerMessage ||
        stkData?.ResultDesc ||
        "STK push failed";
      res.status(200).json({ ok: false, error: errMsg });
      return;
    }

    // Store stk_checkout_id before returning. A fire-and-forget request can be
    // terminated by the serverless runtime, leaving the callback unmatched.
    if (transaction_id && stkData.CheckoutRequestID && supabaseKey) {
      const rpcBody = JSON.stringify({ p_tx_id: transaction_id, p_checkout_id: stkData.CheckoutRequestID });
      const saveResponse = await requestWithTimeout(
        `${supabaseUrl}/rest/v1/rpc/set_stk_checkout_id`,
        {
          method: "POST",
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(rpcBody),
          },
        },
        rpcBody,
        4000
      );
      if (saveResponse.status >= 400) {
        throw new Error("Could not save payment tracking ID");
      }
      console.log("[initiate-stk] stk_checkout_id set via RPC ✓");
    }

    res.status(200).json({
      success:    true,
      checkoutId: stkData.CheckoutRequestID,
      data:       stkData,
    });
  } catch (err) {
    _cachedToken = null;
    _tokenExpiry = 0;
    console.error(`[initiate-stk] error after ${Date.now()-t0}ms:`, err.message);
    res.status(500).json({ ok: false, error: err.message || "Internal error" });
  }
}
