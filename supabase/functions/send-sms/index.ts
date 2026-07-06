import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const SENDER_ID = "PROCALL";
const OTS_ENDPOINT = "https://sms.ots.co.ke/api/v3/sms/send";

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0") && cleaned.length === 10) return "254" + cleaned.slice(1);
  if (cleaned.startsWith("254") && cleaned.length === 12) return cleaned;
  if (cleaned.startsWith("+254")) return cleaned.slice(1);
  return cleaned;
}

// Extract the meaningful error message from an OTS API response body.
// OTS returns HTTP 200 even on errors — the actual status is in the body.
function otsBodyError(data: any): string | null {
  if (!data || typeof data !== "object") return null;
  if (data.status === "error") return data.message || "SMS rejected by gateway";
  if (data.code && Number(data.code) >= 400) return data.message || "SMS rejected by gateway";
  if (Array.isArray(data.recipients)) {
    const failed = data.recipients.find((r: any) => r.status && !/submit/i.test(String(r.status)));
    if (failed) return failed.reason || failed.status || "Recipient rejected";
  }
  return null;
}

async function sendViaOts(phone: string, message: string) {
  const apiKey = Deno.env.get("OTS_API_KEY");
  if (!apiKey) throw new Error("OTS_API_KEY not configured");

  const res = await fetch(OTS_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      recipient: formatPhone(phone),
      sender_id: SENDER_ID,
      type: "plain",
      message,
    }),
  });

  const data = await res.json().catch(() => ({}));

  // Log full OTS response for diagnostics
  console.log(`[send-sms/OTS] To ${phone}: HTTP ${res.status}`, JSON.stringify(data).slice(0, 200));

  if (!res.ok) {
    const errMsg = data?.message || data?.error || `Gateway HTTP error ${res.status}`;
    return { ok: false, status: res.status, data, error: errMsg };
  }

  // OTS returns HTTP 200 even for errors — check the body
  const bodyErr = otsBodyError(data);
  if (bodyErr) {
    console.error(`[send-sms/OTS] Body error for ${phone}:`, bodyErr);
    return { ok: false, status: res.status, data, error: bodyErr };
  }

  return { ok: true, status: res.status, data };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone, message, internal_chat_notify } = await req.json();

    if (!internal_chat_notify) {
      const adminToken = req.headers.get("x-admin-token");
      if (!adminToken) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: adminId } = await supabase.rpc("verify_admin_session", { p_token: adminToken });
      if (!adminId) {
        return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!phone || !message) {
      return new Response(JSON.stringify({ error: "Missing phone or message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await sendViaOts(phone, message);

    if (!result.ok) {
      return new Response(JSON.stringify({ error: result.error, data: result.data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, data: result.data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
