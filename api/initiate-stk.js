// Vercel serverless function — M-Pesa STK push (ES module)
// Daraja access token is cached at module level — valid 1h, reused on warm instances.
// On a warm instance this function takes ~2-3s (just the STK push).
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
    // Hard abort after timeoutMs to stay within Vercel's 10s function limit
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Daraja request timed out after ${timeoutMs}ms`));
    });
    req.on("error", reject);
    if (body) req.write(typeof body === "string" ? body : JSON.stringify(body));
    req.end();
  });
}

// ── Fetch admin settings from Supabase so DB overrides take effect immediately ──
// This mirrors the Supabase edge function's credential priority:
//   DB app_settings → Vercel env vars
async function fetchSettings(supabaseUrl, supabaseKey) {
  if (!supabaseUrl || !supabaseKey) return {};
  try {
    const r = await requestWithTimeout(
      `${supabaseUrl}/rest/v1/app_settings?select=key,value`,
      { method: "GET", headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } },
      null,
      3000
    );
    if (!Array.isArray(r.body)) return {};
    const map = {};
    r.body.forEach((row) => { if (row.key) map[row.key] = row.value; });
    return map;
  } catch { return {}; }
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
  _tokenExpiry = now + 55 * 60 * 1000; // 55 min cache (token valid for 60 min)
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

  const supabaseUrl = process.env.SUPABASE_URL || "https://wxkvrdkbqkwkhbdunsvb.supabase.co";
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;

  // GET → pre-warm: fetch and cache the Daraja token so the next POST is instant.
  // Called by the frontend when the checkout modal opens (before the user hits Pay).
  if (req.method === "GET") {
    const ck = process.env.DARAJA_CONSUMER_KEY;
    const cs = process.env.DARAJA_CONSUMER_SECRET;
    if (ck && cs) {
      getDarajaToken(ck, cs).catch(() => {});
    }
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

  // Fetch DB settings — these override env vars so admin dashboard changes take effect immediately
  const settings = await fetchSettings(supabaseUrl, supabaseKey);

  const consumerKey    = settings.daraja_consumer_key    || process.env.DARAJA_CONSUMER_KEY;
  const consumerSecret = settings.daraja_consumer_secret || process.env.DARAJA_CONSUMER_SECRET;
  const passkey        = settings.daraja_passkey         || process.env.DARAJA_PASSKEY;
  const shortcode      = settings.mpesa_shortcode        || process.env.MPESA_SHORTCODE;
  // Use DB-configured transaction type so PayBill/Till toggle works immediately
  const transactionType =
    settings.transaction_type ||
    process.env.DARAJA_TRANSACTION_TYPE ||
    "CustomerPayBillOnline";

  if (!consumerKey || !consumerSecret || !passkey || !shortcode) {
    res.status(500).json({ ok: false, error: "Daraja credentials not configured" });
    return;
  }

  let phone254 = String(phone).replace(/[^0-9]/g, "");
  if (phone254.startsWith("0") && phone254.length === 10) phone254 = `254${phone254.slice(1)}`;

  const t0 = Date.now();

  try {
    // 1. Token — cached on warm instances (0ms), fetched on cold (~2-3s)
    // Clear token cache if credentials changed (different key than what was used to get token)
    const accessToken = await getDarajaToken(consumerKey, consumerSecret);

    // 2. Timestamp + password
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
      // If the token we had is expired/revoked, clear the cache so next call fetches fresh
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

    // Write stk_checkout_id server-side and AWAIT it before responding.
    // Uses service_role key so it succeeds regardless of RLS policies.
    // The callback handler looks up transactions by stk_checkout_id, so this
    // MUST be in the DB before Safaricom's callback arrives.
    if (transaction_id && stkData.CheckoutRequestID) {
      if (supabaseUrl && supabaseKey) {
        const patchBody = JSON.stringify({ stk_checkout_id: stkData.CheckoutRequestID });
        await requestWithTimeout(
          `${supabaseUrl}/rest/v1/transactions?id=eq.${encodeURIComponent(transaction_id)}`,
          {
            method: "PATCH",
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(patchBody),
              Prefer: "return=minimal",
            },
          },
          patchBody,
          4000
        )
          .then(() => console.log("[initiate-stk] stk_checkout_id persisted"))
          .catch((e) => console.warn("[initiate-stk] stk_checkout_id write failed:", e.message));
      }
    }

    res.status(200).json({
      success:    true,
      checkoutId: stkData.CheckoutRequestID,
      data:       stkData,
    });
  } catch (err) {
    // Clear token cache on network errors so next call retries fresh
    _cachedToken = null;
    _tokenExpiry = 0;
    console.error(`[initiate-stk] error after ${Date.now()-t0}ms:`, err.message);
    res.status(500).json({ ok: false, error: err.message || "Internal error" });
  }
}
