// Vercel — standalone SMS sender endpoint (ES module)
// POST { phone, message }  → sends via OTS API
// Reads OTS key from app_settings first, falls back to env var.
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
    const r = await request(`${supabaseUrl}/rest/v1/app_settings?select=key,value`, {
      method: "GET",
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    });
    if (!Array.isArray(r.body)) return {};
    const map = {};
    r.body.forEach((row) => { if (row.key) map[row.key] = row.value; });
    return map;
  } catch { return {}; }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST")    { res.status(405).json({ error: "Method not allowed" }); return; }

  const body = await parseBody(req);
  const { phone, message } = body;

  if (!phone || !message) {
    res.status(400).json({ error: "phone and message are required" });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || "https://wxkvrdkbqkwkhbdunsvb.supabase.co";
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

  const settings  = await fetchSettings(supabaseUrl, supabaseKey);
  const otsApiKey = settings.ots_api_key || process.env.OTS_API_KEY;

  if (!otsApiKey) {
    res.status(400).json({ error: "OTS API key not configured. Set it in Settings → SMS Gateway." });
    return;
  }

  const cleaned = String(phone).replace(/[^0-9]/g, "");
  const phone254 = cleaned.startsWith("0") && cleaned.length === 10
    ? `254${cleaned.slice(1)}` : cleaned;

  const smsBody = JSON.stringify({ recipient: phone254, sender_id: "PROCALL", type: "plain", message });

  try {
    const r = await request("https://sms.ots.co.ke/api/v3/sms/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${otsApiKey}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(smsBody),
        Accept: "application/json",
      },
    }, smsBody);

    console.log(`[send-sms] To ${phone254}: ${r.status}`, JSON.stringify(r.body).slice(0, 120));

    if (r.status >= 300) {
      res.status(200).json({ error: r.body?.message || r.body?.error || "SMS failed" });
      return;
    }
    res.status(200).json({ success: true });
  } catch (e) {
    console.error("[send-sms] Error:", e.message);
    res.status(500).json({ error: e.message });
  }
}
