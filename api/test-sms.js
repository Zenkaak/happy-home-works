// Vercel serverless function — sends SMS and returns full OTS diagnostic (ES module)
import https from "https";

function otsRequest(url, key, method, body) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const bodyStr = body ? JSON.stringify(body) : null;
      const req = https.request({
        hostname: u.hostname, path: u.pathname + u.search, method: method || "GET",
        headers: {
          Authorization: `Bearer ${key}`, Accept: "application/json", "Content-Type": "application/json",
          ...(bodyStr ? { "Content-Length": Buffer.byteLength(bodyStr) } : {}),
        },
      }, (res) => {
        let d = ""; res.on("data", c => d += c);
        res.on("end", () => { try { resolve({ http: res.statusCode, body: JSON.parse(d) }); } catch { resolve({ http: res.statusCode, body: d }); } });
      });
      req.on("error", e => resolve({ http: 0, body: null, err: e.message }));
      if (bodyStr) req.write(bodyStr);
      req.end();
    } catch (e) { resolve({ http: 0, body: null, err: e.message }); }
  });
}

function parseBody(req) {
  return new Promise(r => { let d = ""; req.on("data", c => d += c); req.on("end", () => { try { r(JSON.parse(d)); } catch { r({}); } }); });
}

async function supabaseGet(url, key, path) {
  return new Promise(resolve => {
    try {
      const u = new URL(url + path);
      const req = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: "GET", headers: { apikey: key, Authorization: `Bearer ${key}` } }, res => {
        let d = ""; res.on("data", c => d += c); res.on("end", () => { try { resolve(JSON.parse(d)); } catch { resolve({}); } });
      });
      req.on("error", () => resolve({})); req.end();
    } catch { resolve({}); }
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  const body = await parseBody(req);
  const { phone } = body;
  if (!phone) { res.status(400).json({ error: "Phone number required" }); return; }

  const supabaseUrl = process.env.SUPABASE_URL || "https://wxkvrdkbqkwkhbdunsvb.supabase.co";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseKey) { res.status(500).json({ error: "Supabase not configured" }); return; }

  const settings = await supabaseGet(supabaseUrl, supabaseKey, "/rest/v1/app_settings?select=key,value");
  const smap = {};
  if (Array.isArray(settings)) settings.forEach(r => { if (r.key) smap[r.key] = r.value; });

  const otsKey = smap.ots_api_key || process.env.OTS_API_KEY;
  const senderId = (smap.sms_sender_id || process.env.OTS_SENDER_ID || "PROCALL").slice(0, 11);

  if (!otsKey) { res.status(400).json({ error: "OTS API key not configured." }); return; }

  // Normalise phone
  let phone254 = String(phone).replace(/[^0-9+]/g, "").replace(/^\+/, "");
  if (phone254.startsWith("0") && phone254.length === 10) phone254 = "254" + phone254.slice(1);

  const BASE = "https://sms.ots.co.ke/api/v3";
  const diag = { phone254, senderId, keyLen: otsKey.length };

  // ── 1. Probe account/sender endpoints to find which exist ────────────────
  const [acct, senders, senderIds, profile, credits] = await Promise.all([
    otsRequest(`${BASE}/account`, otsKey, "GET"),
    otsRequest(`${BASE}/senders`, otsKey, "GET"),
    otsRequest(`${BASE}/sender_ids`, otsKey, "GET"),
    otsRequest(`${BASE}/profile`, otsKey, "GET"),
    otsRequest(`${BASE}/credits`, otsKey, "GET"),
  ]);
  diag.accountInfo = acct.body;
  diag.sendersInfo = senders.body;
  diag.senderIdsInfo = senderIds.body;
  diag.profileInfo = profile.body;
  diag.creditsInfo = credits.body;
  console.log("[test-sms] account:", JSON.stringify(acct.body));
  console.log("[test-sms] senders:", JSON.stringify(senders.body));
  console.log("[test-sms] sender_ids:", JSON.stringify(senderIds.body));
  console.log("[test-sms] profile:", JSON.stringify(profile.body));
  console.log("[test-sms] credits:", JSON.stringify(credits.body));

  // ── 2. Try 3 different send formats in parallel ───────────────────────────
  // Format A: recipient as string (current)
  // Format B: mobile as string
  // Format C: recipients as array
  const msg = `Hi! Test from ${senderId}. Order SMS alerts on.`;

  const [sendA, sendB, sendC] = await Promise.all([
    otsRequest(`${BASE}/sms/send`, otsKey, "POST", { recipient: phone254, sender_id: senderId, message: msg }),
    otsRequest(`${BASE}/sms/send`, otsKey, "POST", { mobile: phone254, sender_id: senderId, message: msg }),
    otsRequest(`${BASE}/sms/send`, otsKey, "POST", { recipients: [phone254], sender_id: senderId, message: msg }),
  ]);
  diag.sendA = { http: sendA.http, body: sendA.body }; // recipient
  diag.sendB = { http: sendB.http, body: sendB.body }; // mobile
  diag.sendC = { http: sendC.http, body: sendC.body }; // recipients[]
  console.log("[test-sms] sendA (recipient):", sendA.http, JSON.stringify(sendA.body));
  console.log("[test-sms] sendB (mobile):", sendB.http, JSON.stringify(sendB.body));
  console.log("[test-sms] sendC (recipients[]):", sendC.http, JSON.stringify(sendC.body));

  // Pick the successful send to check queue status
  const successSend = [sendA, sendB, sendC].find(s => s.body?.status === "success" && s.body?.data?.queue_uid);
  const queueUid = successSend?.body?.data?.queue_uid;
  const checkUrl = successSend?.body?.data?.check_status_url;

  // ── 3. Poll queue + per-recipient (wait 10s) ─────────────────────────────
  if (queueUid) {
    await sleep(10000);
    const [queueResp, perRcptResp] = await Promise.all([
      checkUrl ? otsRequest(checkUrl, otsKey, "GET") : Promise.resolve({ body: null }),
      otsRequest(`${BASE}/sms/${queueUid}/recipients`, otsKey, "GET"),
    ]);
    diag.queueStatus = queueResp.body;
    diag.perRecipient = { http: perRcptResp.http, body: perRcptResp.body };
    console.log("[test-sms] queue:", JSON.stringify(queueResp.body));
    console.log("[test-sms] perRcpt:", perRcptResp.http, JSON.stringify(perRcptResp.body));
  }

  // ── 4. Outcome ────────────────────────────────────────────────────────────
  const anyAccepted = [sendA, sendB, sendC].some(s => s.body?.status === "success");
  if (anyAccepted) {
    res.status(200).json({ success: true, diag });
  } else {
    const errMsg = sendA.body?.message || sendA.body?.error || "All send formats rejected by OTS";
    res.status(200).json({ error: errMsg, diag });
  }
}
