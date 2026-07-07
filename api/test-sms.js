// Vercel serverless function — send a test SMS to the admin notify phone (ES module)
import https from "https";

function request(url, options, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const bodyStr = body ? (typeof body === "string" ? body : JSON.stringify(body)) : null;
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: options.method || "GET",
      headers: {
        ...options.headers,
        ...(bodyStr ? { "Content-Length": Buffer.byteLength(bodyStr) } : {}),
      },
    }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function parseBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => { try { resolve(JSON.parse(data)); } catch { resolve({}); } });
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
  if (body.status === "error") return body.message || "SMS rejected by gateway";
  if (body.code && body.code >= 400) return body.message || "SMS rejected by gateway";
  return null;
}

async function writeSmsLog(supabaseUrl, supabaseKey, phoneNumber, message, status) {
  if (!supabaseUrl || !supabaseKey) return;
  try {
    const logBody = JSON.stringify({ phone_number: phoneNumber, message, status, transaction_id: null });
    await request(`${supabaseUrl}/rest/v1/sms_logs`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(logBody),
        Prefer: "return=minimal",
      },
    }, logBody);
  } catch (e) {
    console.error("[test-sms] sms_log write failed:", e.message);
  }
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

  if (admin_token) {
    const valid = await verifyAdminSession(supabaseUrl, supabaseKey, admin_token);
    if (!valid) { res.status(401).json({ error: "Invalid or expired admin session" }); return; }
  }

  const settings = await fetchSettings(supabaseUrl, supabaseKey);
  const otsApiKey = settings.ots_api_key || process.env.OTS_API_KEY;
  // Use only plain ASCII chars in sender ID (max 11 chars)
  const senderId = (settings.sms_sender_id || process.env.OTS_SENDER_ID || "PROCALL").slice(0, 11);

  if (!otsApiKey) {
    res.status(400).json({ error: "OTS API key not configured. Set it in Settings > SMS Gateway." });
    return;
  }

  // Normalise phone to 254XXXXXXXXX
  let phone254 = String(phone).replace(/[^0-9]/g, "");
  if (phone254.startsWith("0") && phone254.length === 10) phone254 = `254${phone254.slice(1)}`;

  // Plain ASCII only — avoids UCS-2 encoding which splits messages into 70-char parts
  const message = `Test SMS from ${senderId}. Order alerts are active.`;

  try {
    const smsPayload = { recipient: phone254, sender_id: senderId, message };
    const smsBodyStr = JSON.stringify(smsPayload);
    console.log("[test-sms] Sending to OTS:", JSON.stringify({ phone: phone254, sender_id: senderId }));

    const smsResp = await request("https://sms.ots.co.ke/api/v3/sms/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${otsApiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    }, smsPayload);

    const rawOts = smsResp.body;
    console.log("[test-sms] OTS response:", smsResp.status, JSON.stringify(rawOts));

    if (smsResp.status >= 300) {
      const errMsg = (rawOts && (rawOts.message || rawOts.error)) || `Gateway HTTP error ${smsResp.status}`;
      await writeSmsLog(supabaseUrl, supabaseKey, phone254, message, "failed");
      res.status(200).json({ error: errMsg, otsHttp: smsResp.status });
      return;
    }

    const bodyErr = otsError(rawOts);
    if (bodyErr) {
      console.error("[test-sms] OTS body error:", bodyErr);
      await writeSmsLog(supabaseUrl, supabaseKey, phone254, message, "failed");
      res.status(200).json({ error: bodyErr, otsHttp: smsResp.status });
      return;
    }

    // NOTE: OTS routes SMS via carrier — delivery may take a few minutes depending on the carrier.
    await writeSmsLog(supabaseUrl, supabaseKey, phone254, message, "sent");
    res.status(200).json({ success: true, queueUid: rawOts?.data?.queue_uid });
  } catch (err) {
    console.error("[test-sms] error:", err);
    res.status(500).json({ error: err.message || "Internal error" });
  }
}
