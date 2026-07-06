// Vercel serverless function — send a test SMS to the admin notify phone (ES module)
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

async function verifyAdminSession(supabaseUrl, supabaseKey, token) {
  try {
    const bodyStr = JSON.stringify({ p_token: token });
    const resp = await request(`${supabaseUrl}/rest/v1/rpc/verify_admin_session`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(bodyStr),
      },
    }, bodyStr);
    return resp.status === 200 && !!resp.body;
  } catch { return false; }
}

// Extract the meaningful error message from an OTS API response body.
// OTS returns HTTP 200 even on errors — the actual status is in the body.
function otsError(body) {
  if (!body || typeof body !== "object") return null;
  // {"status":"error","message":"..."}
  if (body.status === "error") return body.message || "SMS rejected by gateway";
  // {"code":4xx,"message":"..."}
  if (body.code && body.code >= 400) return body.message || "SMS rejected by gateway";
  // Check per-recipient failure
  if (Array.isArray(body.recipients)) {
    const failed = body.recipients.find((r) => r.status && !/submit/i.test(r.status));
    if (failed) return failed.reason || failed.status || "Recipient rejected";
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  const body = await parseBody(req);
  const { phone, admin_token } = body;

  if (!phone) { res.status(400).json({ error: "Phone number required" }); return; }

  const supabaseUrl = process.env.SUPABASE_URL || "https://wxkvrdkbqkwkhbdunsvb.supabase.co";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseKey) { res.status(500).json({ error: "Supabase not configured" }); return; }

  // Verify admin session
  if (admin_token) {
    const valid = await verifyAdminSession(supabaseUrl, supabaseKey, admin_token);
    if (!valid) { res.status(401).json({ error: "Invalid or expired admin session" }); return; }
  }

  // Get OTS API key from DB first, fallback to env
  const settings = await fetchSettings(supabaseUrl, supabaseKey);
  const otsApiKey = settings.ots_api_key || process.env.OTS_API_KEY;

  if (!otsApiKey) {
    res.status(400).json({ error: "OTS API key not configured. Set it in Settings → SMS Gateway." });
    return;
  }

  // Normalise phone
  let phone254 = String(phone).replace(/[^0-9]/g, "");
  if (phone254.startsWith("0") && phone254.length === 10) phone254 = `254${phone254.slice(1)}`;

  const message = "DASNET Admin Test — your notification SMS is working correctly. Every completed order will alert this number.";

  try {
    const smsBodyStr = JSON.stringify({
      recipient: phone254,
      sender_id: "PROCALL",
      type: "plain",
      message,
    });
    const smsResp = await request("https://sms.ots.co.ke/api/v3/sms/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${otsApiKey}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(smsBodyStr),
        Accept: "application/json",
      },
    }, smsBodyStr);

    const rawOts = smsResp.body;
    console.log("[test-sms] OTS response:", smsResp.status, JSON.stringify(rawOts));

    // Check HTTP-level error first
    if (!smsResp.status || smsResp.status >= 300) {
      const errMsg = (rawOts && (rawOts.message || rawOts.error)) ||
        `Gateway HTTP error ${smsResp.status}`;
      res.status(200).json({ error: errMsg, otsRaw: rawOts, otsHttp: smsResp.status });
      return;
    }

    // Check OTS body-level error — OTS returns HTTP 200 even when delivery fails
    const bodyErr = otsError(rawOts);
    if (bodyErr) {
      console.error("[test-sms] OTS body error:", bodyErr, JSON.stringify(rawOts));
      res.status(200).json({ error: bodyErr, otsRaw: rawOts, otsHttp: smsResp.status });
      return;
    }

    // Success — still return the raw OTS body so admin can inspect it
    res.status(200).json({ success: true, otsRaw: rawOts, otsHttp: smsResp.status });
  } catch (err) {
    console.error("[test-sms] error:", err);
    res.status(500).json({ error: err.message || "Internal error" });
  }
}
