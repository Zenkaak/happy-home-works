import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const ADMIN_PHONE = "254751414437";

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0") && cleaned.length === 10) return "254" + cleaned.slice(1);
  if (cleaned.startsWith("254") && cleaned.length === 12) return cleaned;
  return cleaned;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, ...params } = await req.json();

    // ============ SUBMIT manual payment (public) ============
    if (action === "submit") {
      const { transaction_id, phone_number, amount, mpesa_code, package_name } = params;

      if (!mpesa_code || !phone_number || !amount) {
        return new Response(JSON.stringify({ error: "Missing fields" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const code = String(mpesa_code).trim().toUpperCase();
      if (code.length < 8 || code.length > 15) {
        return new Response(JSON.stringify({ error: "Invalid M-PESA code format" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Prevent duplicates
      const { data: existing } = await supabase
        .from("manual_payments")
        .select("id, status")
        .eq("mpesa_code", code)
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ error: "This M-PESA code was already submitted." }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: mp, error } = await supabase
        .from("manual_payments")
        .insert({
          transaction_id: transaction_id || null,
          phone_number: formatPhone(phone_number),
          amount: Number(amount),
          mpesa_code: code,
          package_name: package_name || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Notify admin
      try {
        await supabase.functions.invoke("send-sms", {
          body: {
            phone: ADMIN_PHONE,
            message: `DASNET — Manual Payment Received\n\nCustomer : ${phone_number}\nAmount   : KSh ${amount}\nM-Pesa   : ${code}\nPackage  : ${package_name || "N/A"}\n\nAwaiting verification in the admin dashboard.`,
          },
        });
      } catch (_) {}

      return new Response(JSON.stringify({ success: true, id: mp.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============ ADMIN actions (require token) ============
    const adminToken = req.headers.get("x-admin-token");
    const { data: adminId } = await supabase.rpc("verify_admin_session", { p_token: adminToken });
    if (!adminId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify") {
      const { id, admin_notes } = params;
      const { data: mp } = await supabase
        .from("manual_payments")
        .select("*")
        .eq("id", id)
        .single();

      if (!mp) throw new Error("Not found");

      // Mark verified
      await supabase
        .from("manual_payments")
        .update({ status: "verified", admin_notes: admin_notes || null, verified_at: new Date().toISOString() })
        .eq("id", id);

      // If linked to a transaction, mark it completed
      if (mp.transaction_id) {
        await supabase
          .from("transactions")
          .update({ status: "completed", mpesa_reference: mp.mpesa_code, failure_reason: null })
          .eq("id", mp.transaction_id);
      }

      // Notify customer
      try {
        await supabase.functions.invoke("send-sms", {
          body: {
            phone: mp.phone_number,
            message: `DASNET — Payment Verified\n\nDear Customer, your payment (Ref: ${mp.mpesa_code}) has been confirmed.\n\n${mp.package_name || "Your order"} is now being delivered to your line.\n\nThank you for choosing DASNET.\nSupport: 0751 414 437`,
          },
        });
      } catch (_) {}

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reject") {
      const { id, admin_notes } = params;
      const { data: mp } = await supabase
        .from("manual_payments").select("*").eq("id", id).single();

      await supabase
        .from("manual_payments")
        .update({ status: "rejected", admin_notes: admin_notes || "Rejected" })
        .eq("id", id);

      if (mp) {
        try {
          await supabase.functions.invoke("send-sms", {
            body: {
              phone: mp.phone_number,
              message: `DASNET — Payment Not Verified\n\nWe could not verify your payment (Ref: ${mp.mpesa_code}).\nReason: ${admin_notes || "The M-Pesa code provided is invalid"}.\n\nPlease confirm the code and try again:\nhttps://hitechz.vercel.app\nSupport: 0751 414 437`,
            },
          });
        } catch (_) {}
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
