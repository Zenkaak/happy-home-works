import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
};

async function verifyAdmin(supabase: any, token: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("verify_admin_session", { p_token: token });
  if (error || !data) return null;
  return data as string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const adminToken = req.headers.get("x-admin-token");
    if (!adminToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminId = await verifyAdmin(supabase, adminToken);
    if (!adminId) {
      return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, ...params } = await req.json();

    switch (action) {
      // --- VENDOR ACTIONS ---
      case "update_vendor": {
        const { id, ...updates } = params;
        const { error } = await supabase.from("vendors").update(updates).eq("id", id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete_vendor": {
        const { error } = await supabase.from("vendors").delete().eq("id", params.id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "ban_vendor": {
        const { id, phone_number } = params;
        // 1. Disable and mark as banned
        const { error: updateErr } = await supabase
          .from("vendors")
          .update({ is_active: false, is_banned: true })
          .eq("id", id);
        if (updateErr) throw updateErr;

        // 2. Add to banned_numbers table to prevent re-registration
        const { error: banErr } = await supabase
          .from("banned_numbers")
          .upsert({ phone_number });
        if (banErr) throw banErr;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // --- EXISTING ACTIONS ---
      case "update_product": {
        const { id, ...updates } = params;
        const { error } = await supabase.from("products").update(updates).eq("id", id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete_product": {
        const { error } = await supabase.from("products").delete().eq("id", params.id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete_transaction": {
        const { error } = await supabase.from("transactions").delete().eq("id", params.id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update_transaction_status": {
        const { error } = await supabase.from("transactions").update({ status: params.status }).eq("id", params.id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "create_product": {
        const { error } = await supabase.from("products").insert(params);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_broadcast_contacts": {
        const { count, error } = await supabase
          .from("broadcast_contacts")
          .select("*", { count: "exact", head: true });
        if (error) throw error;
        return new Response(JSON.stringify({ count: count ?? 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "broadcast_sms": {
        const { data: contacts, error: cErr } = await supabase
          .from("broadcast_contacts")
          .select("phone_number");
        if (cErr) throw cErr;

        const smsApiKey = Deno.env.get("TEXTSMS_API_KEY");
        const partnerId = Deno.env.get("TEXTSMS_PARTNER_ID");
        let successCount = 0;
        let failCount = 0;

        for (const contact of contacts || []) {
          try {
            const smsRes = await fetch("https://sms.textsms.co.ke/api/services/sendsms/", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                apikey: smsApiKey,
                partnerID: partnerId,
                message: params.message,
                shortcode: "TextSMS",
                mobile: contact.phone_number,
              }),
            });
            const smsData = await smsRes.json();

            await supabase.from("sms_logs").insert({
              phone_number: contact.phone_number,
              message: params.message,
              status: smsData?.responses?.[0]?.["respose-code"] === "200" ? "sent" : "failed",
              batch_id: `broadcast-${Date.now()}`,
            });

            if (smsData?.responses?.[0]?.["respose-code"] === "200") {
              successCount++;
            } else {
              failCount++;
            }
          } catch {
            failCount++;
          }
        }

        return new Response(JSON.stringify({ successCount, failCount, total: (contacts || []).length }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "create_announcement": {
        const { error } = await supabase.from("announcements").insert({ title: params.title, message: params.message });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "toggle_announcement": {
        const { error } = await supabase.from("announcements").update({ is_active: params.is_active }).eq("id", params.id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete_announcement": {
        const { error } = await supabase.from("announcements").delete().eq("id", params.id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "send_chat_reply": {
        const { conversation_id, message: msg } = params;
        const { error } = await supabase.from("chat_messages").insert({
          conversation_id,
          sender_type: "admin",
          message: msg,
        });
        if (error) throw error;

        await supabase.from("chat_conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", conversation_id);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
 
