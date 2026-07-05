// Vercel serverless function — M-Pesa STK push
// Uses Vercel env vars so no Supabase function deployment needed.

/** Read + JSON-parse the raw request body (Vercel doesn't auto-parse). */
function parseBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
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
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { phone, amount, transaction_id, account_ref } = await parseBody(req);

  if (!phone || !amount) {
    return res.status(400).json({ ok: false, error: "Missing phone or amount" });
  }

  const consumerKey    = process.env.DARAJA_CONSUMER_KEY;
  const consumerSecret = process.env.DARAJA_CONSUMER_SECRET;
  const passkey        = process.env.DARAJA_PASSKEY;
  const shortcode      = process.env.MPESA_SHORTCODE;
  const supabaseUrl    = process.env.SUPABASE_URL    || "https://wxkvrdkbqkwkhbdunsvb.supabase.co";
  const supabaseKey    = process.env.SUPABASE_ANON_KEY;

  if (!consumerKey || !consumerSecret || !passkey || !shortcode) {
    return res.status(500).json({ ok: false, error: "Daraja credentials not configured" });
  }

  // Normalise phone to 254XXXXXXXXX
  let formattedPhone = String(phone).replace(/[^0-9]/g, "");
  if (formattedPhone.startsWith("0") && formattedPhone.length === 10) {
    formattedPhone = "254" + formattedPhone.slice(1);
  }

  try {
    // 1. Get Daraja access token
    const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    const tokenRes  = await fetch(
      "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      { headers: { Authorization: `Basic ${credentials}` } }
    );
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return res.status(502).json({ ok: false, error: "Failed to get Daraja token" });
    }

    // 2. Build timestamp + password
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const timestamp =
      `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
      `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");

    // 3. STK push — callback handled by Supabase function (unchanged)
    const stkRes  = await fetch("https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest", {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password:          password,
        Timestamp:         timestamp,
        TransactionType:   "CustomerPayBillOnline",
        Amount:            Math.ceil(Number(amount)),
        PartyA:            formattedPhone,
        PartyB:            shortcode,
        PhoneNumber:       formattedPhone,
        CallBackURL:       `${supabaseUrl}/functions/v1/initiate-stk/callback`,
        AccountReference:  (account_ref || "DASNET").slice(0, 12),
        TransactionDesc:   (account_ref || "DASNET Payment").slice(0, 13),
      }),
    });
    const stkData = await stkRes.json();

    if (stkData.ResponseCode !== "0") {
      return res.status(200).json({
        ok: false,
        error: stkData.errorMessage || stkData.CustomerMessage || "STK push failed",
      });
    }

    // 4. Update transaction in Supabase
    if (transaction_id && supabaseKey) {
      await fetch(`${supabaseUrl}/rest/v1/transactions?id=eq.${transaction_id}`, {
        method: "PATCH",
        headers: {
          apikey:          supabaseKey,
          Authorization:   `Bearer ${supabaseKey}`,
          "Content-Type":  "application/json",
          Prefer:          "return=minimal",
        },
        body: JSON.stringify({
          stk_checkout_id: stkData.CheckoutRequestID,
          status:          "processing",
          failure_reason:  null,
        }),
      });
    }

    return res.status(200).json({ success: true, data: stkData });
  } catch (err) {
    console.error("[initiate-stk]", err);
    return res.status(500).json({ ok: false, error: err.message || "Internal error" });
  }
};
