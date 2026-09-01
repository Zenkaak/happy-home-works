import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-customer-token",
};

const SENDER_ID = "PROCALL";
const OTS_ENDPOINT = "https://sms.ots.co.ke/api/v3/sms/send";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const admin = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

function normalisePhone(raw: string): string | null {
  const cleaned = String(raw || "").replace(/[^0-9]/g, "");
  let p = cleaned;
  if (p.startsWith("0") && p.length === 10) p = "254" + p.slice(1);
  if (!/^254[17]\d{8}$/.test(p)) return null;
  return p;
}

async function sendSms(phone: string, message: string) {
  const apiKey = Deno.env.get("OTS_API_KEY");
  if (!apiKey) throw new Error("SMS gateway not configured");
  const res = await fetch(OTS_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      recipient: phone,
      sender_id: SENDER_ID,
      type: "plain",
      message,
    }),
  });
  const data = await res.json().catch(() => ({}));
  console.log(`[customer-auth] OTS ${res.status}`, JSON.stringify(data).slice(0, 200));
  if (!res.ok || data?.status === "error") {
    throw new Error(data?.message || `SMS gateway error ${res.status}`);
  }
}

async function requestOtp(phone: string) {
  const db = admin();

  // Rate limit: max 3 codes per phone in 10 minutes
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await db
    .from("customer_otps")
    .select("id", { count: "exact", head: true })
    .eq("phone_number", phone)
    .gt("created_at", since);
  if ((count ?? 0) >= 3) {
    return json({ error: "Too many code requests. Please wait a few minutes." }, 429);
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  await db.from("customer_otps").delete().eq("phone_number", phone);
  const { error } = await db.from("customer_otps").insert({ phone_number: phone, code });
  if (error) throw error;

  await sendSms(
    phone,
    `${code} is your DASNET login code. It expires in 5 minutes. Do not share it with anyone.`,
  );

  return json({ success: true });
}

async function verifyOtp(phone: string, code: string) {
  const db = admin();
  const { data: rows } = await db
    .from("customer_otps")
    .select("*")
    .eq("phone_number", phone)
    .order("created_at", { ascending: false })
    .limit(1);

  const otp = rows?.[0];
  if (!otp) return json({ error: "No code found. Request a new one." }, 400);
  if (new Date(otp.expires_at).getTime() < Date.now()) {
    return json({ error: "Code expired. Request a new one." }, 400);
  }
  if (otp.attempts >= 5) {
    return json({ error: "Too many wrong attempts. Request a new code." }, 429);
  }
  if (String(otp.code) !== String(code).trim()) {
    await db.from("customer_otps").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
    return json({ error: "Incorrect code" }, 400);
  }

  await db.from("customer_otps").delete().eq("phone_number", phone);
  await db.from("customer_sessions").delete().lt("expires_at", new Date().toISOString());

  const { data: session, error } = await db
    .from("customer_sessions")
    .insert({ phone_number: phone })
    .select("id")
    .single();
  if (error) throw error;

  return json({ success: true, token: session.id, phone });
}

async function sessionPhone(token: string): Promise<string | null> {
  if (!token) return null;
  const db = admin();
  const { data } = await db
    .from("customer_sessions")
    .select("phone_number, expires_at")
    .eq("id", token)
    .maybeSingle();
  if (!data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  return data.phone_number as string;
}

async function myOrders(phone: string) {
  const db = admin();
  const { data, error } = await db
    .from("transactions")
    .select(
      "id, order_number, package_name, category, network, amount, status, mpesa_reference, kplc_token, meter_number, service_number, failure_reason, created_at, product_id",
    )
    .eq("phone_number", phone)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return json({ phone, orders: data ?? [] });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    if (action === "request_otp" || action === "verify_otp") {
      const phone = normalisePhone(body.phone);
      if (!phone) return json({ error: "Enter a valid Kenyan phone number" }, 400);

      const banned = await admin().rpc("is_banned", { p_phone: phone });
      if (banned.data === true) return json({ error: "This number cannot log in" }, 403);

      if (action === "request_otp") return await requestOtp(phone);

      const code = String(body.code || "");
      if (!/^\d{4,8}$/.test(code)) return json({ error: "Enter the code from your SMS" }, 400);
      return await verifyOtp(phone, code);
    }

    if (action === "me" || action === "logout") {
      const token = req.headers.get("x-customer-token") || String(body.token || "");
      const phone = await sessionPhone(token);
      if (!phone) return json({ error: "Session expired" }, 401);

      if (action === "logout") {
        await admin().from("customer_sessions").delete().eq("id", token);
        return json({ success: true });
      }
      return await myOrders(phone);
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("[customer-auth]", err);
    return json({ error: (err as Error).message || "Internal error" }, 500);
  }
});
