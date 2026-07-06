// Vercel — Safaricom B2C result/timeout callback handler
// Logs the full result so it appears in Vercel function logs.
// Also writes to Supabase audit_logs for the admin dashboard.
import https from "https";

function request(url, options, body, timeoutMs = 6000) {
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
    req.setTimeout(timeoutMs, () => req.destroy(new Error(`Timeout: ${url}`)));
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
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  let body = {};
  try { body = await parseBody(req); } catch { /* ignore */ }

  const isTimeout = String(req.url || "").includes("timeout") || String(req.query?.type) === "timeout";
  const eventType = isTimeout ? "admin_b2c_timeout" : "admin_b2c_result";

  // ── Log every field so it's visible in `vercel logs --expand` ──
  const result = body?.Result || body;
  const resultCode = result?.ResultCode;
  const resultDesc = result?.ResultDesc || "";
  const convId     = result?.ConversationID || result?.OriginatorConversationID || "";
  const txId       = result?.TransactionID || "";

  // Pull ResultParameters into a flat map
  const params = {};
  (result?.ResultParameters?.ResultParameter || []).forEach((p) => {
    if (p.Key) params[p.Key] = p.Value;
  });

  if (isTimeout) {
    console.warn(`[b2c-timeout] ConvID=${convId} — Safaricom did not process in time`);
  } else if (String(resultCode) === "0") {
    console.log(
      `[b2c-result] SUCCESS ConvID=${convId} TxID=${txId}` +
      ` Amount=${params.TransactionAmount}` +
      ` Recipient=${params.ReceiverPartyPublicName}` +
      ` WorkingBal=${params.B2CWorkingAccountAvailableFunds}` +
      ` UtilityBal=${params.B2CUtilityAccountAvailableFunds}`
    );
  } else {
    console.error(`[b2c-result] FAILED ConvID=${convId} Code=${resultCode} Desc="${resultDesc}"`);
  }
  console.log("[b2c-result] full payload:", JSON.stringify(body));

  // ── Write to Supabase audit_logs (best-effort) ──
  try {
    const supabaseUrl = process.env.SUPABASE_URL || "https://wxkvrdkbqkwkhbdunsvb.supabase.co";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
    if (supabaseKey) {
      const auditBody = JSON.stringify([{
        action: eventType,
        details: { created_at: new Date().toISOString(), result_code: resultCode, result_desc: resultDesc, conv_id: convId, tx_id: txId, params, raw: body },
        created_at: new Date().toISOString(),
      }]);
      await request(
        `${supabaseUrl}/rest/v1/audit_logs`,
        {
          method: "POST",
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(auditBody),
            Prefer: "return=minimal",
          },
        },
        auditBody
      );
    }
  } catch (e) {
    console.warn("[b2c-result] audit write failed:", e.message);
  }

  // Safaricom requires a 200 response
  res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
}
