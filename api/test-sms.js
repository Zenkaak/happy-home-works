// Vercel serverless function — diagnostic test SMS (ES module)
import https from "https";

function request(url, options, body) {
  return new Promise((resolve, reject) => {
    try {
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
      req.on("error", (e) => resolve({ status: 0, body: null, error: e.message }));
      if (bodyStr) req.write(bodyStr);
      req.end();
    } catch (e) {
      resolve({ status: 0, body: null, error: e.message });
    }
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
    resp.body.forEach((r) => { if (r.key) map[r.key] = r.value; });
    return map;
  } catch { return {}; }
}

async function verifyAdminSession(supabaseUrl, supabaseKey, token) {
  try {
    const bodyStr = JSON.stringify({ p_token: token });
    const resp = await request(`${supabaseUrl}/rest/v1/rpc/verify_admin_session`, {
      method: "POST",
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/json" },
    }, bodyStr);
    return resp.status === 200 && !!resp.body;
  } catch { return false; }
}

function otsAuthHeaders(key) {
  return { Authorization: `Bearer ${key}`, Accept: "application/json", "Content-Type": "application/json" };
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

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
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseKey) { res.status(500).json({ error: "Supabase not configured" }); return; }

  if (admin_token) {
    const valid = await verifyAdminSession(supabaseUrl, supabaseKey, admin_token);
    if (!valid) { res.status(401).json({ error: "Invalid or expired admin session" }); return; }
  }

  const settings = await fetchSettings(supabaseUrl, supabaseKey);
  const otsApiKey = settings.ots_api_key || process.env.OTS_API_KEY;
  const senderId = (settings.sms_sender_id || process.env.OTS_SENDER_ID || "PROCALL").slice(0, 11);

  if (!otsApiKey) {
    res.status(400).json({ error: "OTS API key not configured. Set it in Settings > SMS Gateway." });
    return;
  }

  // Normalise phone to 254XXXXXXXXX
  let phone254 = String(phone).replace(/[^0-9+]/g, "").replace(/^\+/, "");
  if (phone254.startsWith("0") && phone254.length === 10) phone254 = "254" + phone254.slice(1);

  const diag = { phone254, senderId, otsKeyLen: otsApiKey.length };

  // ── 1. Check OTS account balance / info ──────────────────────────────────
  const [balanceResp, senderResp] = await Promise.all([
    request("https://sms.ots.co.ke/api/v3/account/balance", { method: "GET", headers: otsAuthHeaders(otsApiKey) }),
    request("https://sms.ots.co.ke/api/v3/sender-ids", { method: "GET", headers: otsAuthHeaders(otsApiKey) }),
  ]);
  diag.balance = balanceResp.body;
  diag.senderIds = senderResp.body;
  console.log("[test-sms] balance:", JSON.stringify(balanceResp.body));
  console.log("[test-sms] senderIds:", JSON.stringify(senderResp.body));

  // ── 2. Send the SMS ───────────────────────────────────────────────────────
  const message = `Test SMS from ${senderId}. Order alerts are active. Ref: ${Date.now()}`;
  const sendPayload = { recipient: phone254, sender_id: senderId, message };

  let sendResp;
  try {
    sendResp = await request("https://sms.ots.co.ke/api/v3/sms/send", {
      method: "POST",
      headers: otsAuthHeaders(otsApiKey),
    }, sendPayload);
  } catch (err) {
    res.status(200).json({ error: err.message, diag });
    return;
  }

  const rawOts = sendResp.body;
  diag.sendHttp = sendResp.status;
  diag.sendBody = rawOts;
  console.log("[test-sms] send:", sendResp.status, JSON.stringify(rawOts));

  if (sendResp.status >= 300) {
    const errMsg = rawOts?.message || rawOts?.error || `HTTP ${sendResp.status}`;
    res.status(200).json({ error: errMsg, diag });
    return;
  }
  if (rawOts?.status === "error") {
    res.status(200).json({ error: rawOts.message || "OTS rejected request", diag });
    return;
  }

  // ── 3. Poll queue + per-recipient status (try multiple endpoints) ─────────
  const queueUid = rawOts?.data?.queue_uid || rawOts?.queue_uid;
  const checkStatusUrl = rawOts?.data?.check_status_url || rawOts?.check_status_url;

  console.log("[test-sms] waiting 10s for delivery...");
  await sleep(10000);

  // Try all possible OTS status endpoints in parallel
  const [queueResp, recipientsResp, reportResp] = await Promise.all([
    checkStatusUrl
      ? request(checkStatusUrl, { method: "GET", headers: otsAuthHeaders(otsApiKey) })
      : Promise.resolve({ status: 0, body: null }),
    queueUid
      ? request(`https://sms.ots.co.ke/api/v3/sms/queue/${queueUid}/recipients`, { method: "GET", headers: otsAuthHeaders(otsApiKey) })
      : Promise.resolve({ status: 0, body: null }),
    queueUid
      ? request(`https://sms.ots.co.ke/api/v3/sms/report?queue_uid=${queueUid}`, { method: "GET", headers: otsAuthHeaders(otsApiKey) })
      : Promise.resolve({ status: 0, body: null }),
  ]);

  diag.queueStatus = queueResp.body;
  diag.recipientsStatus = { http: recipientsResp.status, body: recipientsResp.body };
  diag.reportStatus = { http: reportResp.status, body: reportResp.body };

  console.log("[test-sms] queue:", JSON.stringify(queueResp.body));
  console.log("[test-sms] recipients:", recipientsResp.status, JSON.stringify(recipientsResp.body));
  console.log("[test-sms] report:", reportResp.status, JSON.stringify(reportResp.body));

  // ── 4. Determine outcome ──────────────────────────────────────────────────
  const queueData = queueResp.body?.data || queueResp.body || {};
  const failCount = queueData.failed_count ?? 0;
  const queueDone = queueData.status === "completed";

  // Check per-recipient failures in recipients endpoint
  const recipientRows = recipientsResp.body?.data || recipientsResp.body?.recipients || recipientsResp.body || [];
  const failedRcpt = Array.isArray(recipientRows)
    ? recipientRows.find((r) => /fail|reject|error|invalid|unapprove|dnd|block/i.test(JSON.stringify(r)))
    : null;

  if (failedRcpt) {
    const reason = failedRcpt.reason || failedRcpt.status || failedRcpt.failure_reason || "Delivery failed";
    res.status(200).json({ error: `Delivery failed: ${reason}`, diag });
    return;
  }

  if (failCount > 0) {
    res.status(200).json({ error: `OTS reports ${failCount} failed recipient(s)`, diag });
    return;
  }

  // Queue completed with no detected failures
  res.status(200).json({ success: true, queued: queueDone, diag });
}
