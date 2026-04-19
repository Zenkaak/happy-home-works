import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
};

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0") && cleaned.length === 10) return "254" + cleaned.slice(1);
  if (cleaned.startsWith("254") && cleaned.length === 12) return cleaned;
  if (cleaned.startsWith("+254")) return cleaned.slice(1);
  return cleaned;
}

async function sendViaAfricasTalking(phone: string, message: string, includeSenderId: boolean) {
  const apiKey = Deno.env.get("AT_API_KEY");
  const username = Deno.env.get("AT_USERNAME");
  const senderId = Deno.env.get("AT_SENDER_ID");

  if (!apiKey || !username) throw new Error("Africa's Talking credentials not configured");

  const params = new URLSearchParams({
    username,
    to: "+" + formatPhone(phone),
    message,
  });

  if (includeSenderId && senderId) params.append("from", senderId);

  const url = username === "sandbox"
    ? "https://api.sandbox.africastalking.com/version1/messaging"
    : "https://api.africastalking.com/version1/messaging";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      apiKey,
    },
    body: params.toString(),
  });

  return await res.json();
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

    let data = await sendViaAfricasTalking(phone, message, true);
    const invalidSenderId = JSON.stringify(data).includes("InvalidSenderId");

    if (invalidSenderId) {
      console.warn("AT sender id rejected, retrying without sender id");
      data = await sendViaAfricasTalking(phone, message, false);
    }

    const recipient = data?.SMSMessageData?.Recipients?.[0];
    const success = recipient?.status === "Success";

    return new Response(JSON.stringify({ success, data }), {
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
