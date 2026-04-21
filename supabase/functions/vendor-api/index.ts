import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const ADMIN_PHONE = "254751414437";
const APP_PUBLIC_URL = "https://convo-build-buddy.lovable.app";

// ---------------- HELPERS ----------------

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, "");

  if (cleaned.startsWith("0") && cleaned.length === 10) return "254" + cleaned.slice(1);
  if (cleaned.startsWith("254") && cleaned.length === 12) return cleaned;
  if (cleaned.startsWith("+254")) return cleaned.slice(1);

  return cleaned;
}

// ---------------- MAIN SERVER ----------------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);

    // safe JSON parsing
    let params: any = {};
    try {
      params = await req.json();
    } catch {
      params = {};
    }

    // Read action from URL (used by Safaricom callbacks) OR body (used by frontend invoke)
    const action = url.searchParams.get("action") || params?.action;

    // ---------------- ROUTER ----------------

    switch (action) {

      // ================= REGISTER =================
      case "register": {
        const { name, phone, password, mpesa_payout } = params;

        const formattedPhone = formatPhone(phone);

        const { data: existing } = await supabase
          .from("vendors")
          .select("id")
          .eq("phone", formattedPhone)
          .maybeSingle();

        if (existing) {
          return new Response(
            JSON.stringify({ error: "Phone already registered" }),
            { status: 409, headers: corsHeaders }
          );
        }

        const { data: hashData } = await supabase.rpc("hash_password", {
          p_password: password,
        });

        const { data: vendor, error } = await supabase
          .from("vendors")
          .insert({
            name,
            phone: formattedPhone,
            password_hash: hashData,
            mpesa_payout: formatPhone(mpesa_payout),
            commission_balance: 0,
            status: "approved",
            approved_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({
            success: true,
            vendor_id: vendor.id,
            name: vendor.name,
            referral_code: vendor.referral_code,
          }),
          { headers: corsHeaders }
        );
      }

      // ================= LOGIN =================
      case "login": {
        // Always return HTTP 200 so the client can read { ok, error, ... }.
        const { data: statusRows, error: statusErr } = await supabase.rpc("vendor_login_status", {
          p_phone: formatPhone(params.phone),
          p_password: params.password,
        });

        if (statusErr) {
          return new Response(
            JSON.stringify({ ok: false, error: `Login check failed: ${statusErr.message}` }),
            { status: 200, headers: corsHeaders }
          );
        }

        const row = statusRows?.[0];
        if (!row) {
          return new Response(
            JSON.stringify({ ok: false, error: "Invalid phone or password" }),
            { status: 200, headers: corsHeaders }
          );
        }

        if (row.vendor_status === "banned") {
          return new Response(
            JSON.stringify({
              ok: false,
              banned: true,
              vendor_name: row.vendor_name,
              error: "Your vendor account has been suspended.",
            }),
            { status: 200, headers: corsHeaders }
          );
        }

        // For pending/approved, fall through to verify_vendor (it auto-approves pending).
        const { data, error } = await supabase.rpc("verify_vendor", {
          p_phone: formatPhone(params.phone),
          p_password: params.password,
        });

        const verified = data?.[0];
        if (error || !verified) {
          return new Response(
            JSON.stringify({ ok: false, error: error?.message || "Invalid credentials" }),
            { status: 200, headers: corsHeaders }
          );
        }

        return new Response(
          JSON.stringify({
            ok: true,
            vendor_id: verified.vendor_id,
            name: verified.vendor_name,
            referral_code: verified.vendor_referral_code,
          }),
          { status: 200, headers: corsHeaders }
        );
      }

      // ================= DASHBOARD =================
      case "get_dashboard": {
        const { vendor_id } = params;

        const { data: vendor } = await supabase
          .from("vendors")
          .select("*")
          .eq("id", vendor_id)
          .single();

        const { data: sales } = await supabase
          .from("transactions")
          .select("*")
          .eq("referral_code", vendor.referral_code);

        const { data: withdrawals } = await supabase
          .from("withdrawals")
          .select("*")
          .eq("vendor_id", vendor_id);

        const completedSales = (sales || []).filter((s: any) => s.status === "completed");
        const total_revenue = completedSales.reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0);
        const commission_rate = Number(vendor?.commission_rate || 0.1);

        return new Response(
          JSON.stringify({
            vendor,
            sales: sales || [],
            withdrawals: withdrawals || [],
            stats: {
              total_sales: completedSales.length,
              total_revenue,
              commission: Number(vendor?.commission_balance || 0),
              commission_rate,
            },
          }),
          { headers: corsHeaders }
        );
      }

      // ================= WITHDRAWAL =================
      case "request_withdrawal": {
        const { vendor_id, amount } = params;
        const amt = Number(amount);

        const { data: vendor } = await supabase
          .from("vendors")
          .select("name, phone, commission_balance, mpesa_payout")
          .eq("id", vendor_id)
          .single();

        if (!vendor) throw new Error("Vendor not found");

        const currentBalance = Number(vendor.commission_balance);

        if (currentBalance < amt) {
          return new Response(
            JSON.stringify({ error: "Insufficient balance" }),
            { status: 400, headers: corsHeaders }
          );
        }

        const newBalance = currentBalance - amt;

        const { error: updateErr, data: updated } = await supabase
          .from("vendors")
          .update({ commission_balance: newBalance })
          .eq("id", vendor_id)
          .eq("commission_balance", currentBalance)
          .select();

        if (updateErr || !updated?.length) {
          return new Response(
            JSON.stringify({ error: "Balance changed, retry" }),
            { status: 409, headers: corsHeaders }
          );
        }

        const { data: withdrawal } = await supabase
          .from("withdrawals")
          .insert({
            vendor_id,
            amount: amt,
            phone: vendor.mpesa_payout,
            status: "processing",
          })
          .select()
          .single();

        const consumerKey = Deno.env.get("DARAJA_CONSUMER_KEY");
        const consumerSecret = Deno.env.get("DARAJA_CONSUMER_SECRET");
        const initiatorName = Deno.env.get("MPESA_INITIATOR_NAME");
        const securityCredential = Deno.env.get("MPESA_SECURITY_CREDENTIAL");
        const shortcode = Deno.env.get("MPESA_SHORTCODE");
        const projectUrl = Deno.env.get("SUPABASE_URL");

        // Helper: revert balance + mark withdrawal failed + notify
        const failWithdrawal = async (reason: string) => {
          console.error("❌ B2C FAILURE:", reason);
          await supabase
            .from("withdrawals")
            .update({ status: "failed", failure_reason: reason })
            .eq("id", withdrawal.id);
          // Refund vendor balance
          await supabase.rpc("hash_password", { p_password: "x" }).then(() => {}).catch(() => {});
          const { data: v } = await supabase
            .from("vendors")
            .select("commission_balance")
            .eq("id", vendor_id)
            .single();
          await supabase
            .from("vendors")
            .update({ commission_balance: Number(v?.commission_balance || 0) + amt })
            .eq("id", vendor_id);
          // Notify admin
          try {
            await supabase.functions.invoke("send-sms", {
              body: {
                phone: ADMIN_PHONE,
                message: `WITHDRAWAL FAILED\nVendor: ${vendor.name}\nAmount: KSH ${amt}\nPhone: ${vendor.mpesa_payout}\nReason: ${reason}`,
              },
            });
          } catch (_) {}
        };

        try {
          const auth = btoa(`${consumerKey}:${consumerSecret}`);

          const tokenRes = await fetch(
            "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
            { headers: { Authorization: `Basic ${auth}` } }
          );
          const tokenData = await tokenRes.json();
          console.log("TOKEN RESP:", JSON.stringify(tokenData));

          if (!tokenData.access_token) {
            await failWithdrawal(`OAuth failed: ${JSON.stringify(tokenData)}`);
            return new Response(
              JSON.stringify({ error: "M-Pesa authentication failed. Balance refunded.", details: tokenData }),
              { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          const b2cPayload = {
            InitiatorName: initiatorName,
            SecurityCredential: securityCredential,
            CommandID: "BusinessPayment",
            Amount: Math.floor(amt),
            PartyA: shortcode,
            PartyB: formatPhone(vendor.mpesa_payout),
            Remarks: "Vendor Commission Withdrawal",
            QueueTimeOutURL: `${projectUrl}/functions/v1/vendor-api?action=b2c_timeout&withdrawal_id=${withdrawal.id}`,
            ResultURL: `${projectUrl}/functions/v1/vendor-api?action=b2c_result&withdrawal_id=${withdrawal.id}`,
            Occasion: "Withdrawal",
          };
          console.log("B2C REQUEST:", JSON.stringify(b2cPayload));

          const b2cRes = await fetch(
            "https://api.safaricom.co.ke/mpesa/b2c/v1/paymentrequest",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(b2cPayload),
            }
          );

          const b2cData = await b2cRes.json();
          console.log("B2C RESPONSE:", JSON.stringify(b2cData));

          if (b2cData.ResponseCode !== "0") {
            const reason = b2cData.errorMessage || b2cData.ResponseDescription || JSON.stringify(b2cData);
            await failWithdrawal(reason);
            return new Response(
              JSON.stringify({ error: `M-Pesa rejected: ${reason}. Balance refunded.`, details: b2cData }),
              { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Notify vendor that payout is on the way
          try {
            await supabase.functions.invoke("send-sms", {
              body: {
                phone: vendor.mpesa_payout,
                message: `Hi ${vendor.name}, your withdrawal of KSH ${amt} is being processed. You'll receive M-Pesa shortly.`,
              },
            });
          } catch (_) {}

          return new Response(
            JSON.stringify({ success: true, data: b2cData }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch (e: any) {
          await failWithdrawal(e?.message || "Unknown error");
          return new Response(
            JSON.stringify({ error: `Withdrawal failed: ${e?.message}. Balance refunded.` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // ================= B2C RESULT (CRITICAL FIX) =================
      case "b2c_result": {
        console.log("🔥 B2C RESULT HIT:", JSON.stringify(params, null, 2));

        const withdrawalId = url.searchParams.get("withdrawal_id");
        const result = params?.Result;

        if (withdrawalId && result) {
          const success = result.ResultCode === 0;

          // Fetch withdrawal so we can refund vendor on failure (and avoid double-processing)
          const { data: w } = await supabase
            .from("withdrawals")
            .select("id, vendor_id, amount, status")
            .eq("id", withdrawalId)
            .single();

          if (w && w.status !== "completed" && w.status !== "failed") {
            if (success) {
              await supabase
                .from("withdrawals")
                .update({
                  status: "completed",
                  mpesa_reference:
                    result?.ResultParameters?.ResultParameter?.find(
                      (i: any) => i.Key === "TransactionReceipt"
                    )?.Value,
                  completed_at: new Date().toISOString(),
                })
                .eq("id", withdrawalId);
            } else {
              // Mark failed AND REFUND vendor balance
              await supabase
                .from("withdrawals")
                .update({
                  status: "failed",
                  failure_reason: result.ResultDesc,
                })
                .eq("id", withdrawalId);

              const { data: v } = await supabase
                .from("vendors")
                .select("commission_balance, name, phone")
                .eq("id", w.vendor_id)
                .single();

              if (v) {
                await supabase
                  .from("vendors")
                  .update({
                    commission_balance: Number(v.commission_balance || 0) + Number(w.amount),
                  })
                  .eq("id", w.vendor_id);

                // Notify vendor that money was refunded
                try {
                  await supabase.functions.invoke("send-sms", {
                    body: {
                      phone: v.phone,
                      message: `DASNET: Withdrawal of KSH ${w.amount} failed. Funds returned to wallet.`,
                    },
                  });
                } catch (_) {}
              }
            }
          }
        }

        // ✅ ALWAYS return 200 to Safaricom
        return new Response(
          JSON.stringify({
            ResultCode: 0,
            ResultDesc: "Accepted"
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      // ================= TIMEOUT =================
      case "b2c_timeout": {
        console.log("⏱️ TIMEOUT:", JSON.stringify(params, null, 2));

        return new Response(
          JSON.stringify({
            ResultCode: 0,
            ResultDesc: "Accepted"
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      // ================= DEFAULT =================
      default:
        return new Response(
          JSON.stringify({ error: "Unknown action" }),
          { status: 400, headers: corsHeaders }
        );
    }

  } catch (error: any) {
    console.error("FATAL ERROR:", error);

    return new Response(
      JSON.stringify({
        ResultCode: 0,
        ResultDesc: "Accepted"
      }),
      {
        status: 200,
        headers: corsHeaders
      }
    );
  }
}); 
