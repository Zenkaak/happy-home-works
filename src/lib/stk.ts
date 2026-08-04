import { supabase } from "@/integrations/supabase/client";

type InitiateStkPayload = {
  phone: string;
  amount: number;
  transaction_id: string;
  account_ref: string;
  order_number?: number | null;
  package_name?: string;
};

type StkResult = {
  checkoutId?: string;
};

// ---------------------------------------------------------------------------
// Path 1 — Supabase edge function (PRIMARY)
// Runs with service_role so it can reach Safaricom and write to the DB.
// CallbackURL routes back to the edge function — no extra infra needed.
// ---------------------------------------------------------------------------
async function trySupabaseFunction(payload: InitiateStkPayload): Promise<StkResult> {
  const { data, error } = await supabase.functions.invoke("initiate-stk", {
    body: payload,
  });
  if (error)              throw error;
  if (data?.ok === false) throw new Error(data.error || "STK push failed");
  if (data?.error)        throw new Error(data.error);
  if (!data?.success)     throw new Error("STK push was not accepted");
  const checkoutId =
    data.checkoutId ||
    data.data?.CheckoutRequestID ||
    data.checkout_request_id;
  return { checkoutId };
}

// ---------------------------------------------------------------------------
// Path 2 — Vercel serverless function (FALLBACK)
// Used when the Supabase edge function is unavailable.
// Note: Vercel Lambda may not be able to reach api.safaricom.co.ke directly
// (Safaricom blocks some cloud provider IP ranges). The Supabase path is
// preferred because Deno Deploy has reliable connectivity to Safaricom.
// ---------------------------------------------------------------------------
async function tryVercelFunction(payload: InitiateStkPayload): Promise<StkResult> {
  const res = await fetch("/api/initiate-stk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data: any = await res.json().catch(() => ({}));
  if (data?.ok === false) throw new Error(data.error || "STK push failed");
  if (data?.error)        throw new Error(data.error);
  if (!data?.success)     throw new Error("STK push failed");
  return { checkoutId: data.checkoutId };
}

// ---------------------------------------------------------------------------
// Daraja-level errors that come back FROM the user's M-Pesa interaction.
// Do NOT retry these — they would trigger a second STK prompt on the phone.
// Network/infra errors (timeouts reaching Safaricom servers, connection
// refused, etc.) are intentionally excluded so the fallback path is tried.
// ---------------------------------------------------------------------------
const DARAJA_ERROR_RE = /cancelled|insufficient|wrong pin|unresolved|blocked/i;

export const initiateStkPush = async (payload: InitiateStkPayload): Promise<StkResult> => {
  let primaryError: Error | null = null;

  // Supabase edge function — primary path. It has service_role access and
  // reliable network connectivity to Safaricom's Daraja API.
  try {
    return await trySupabaseFunction(payload);
  } catch (err: any) {
    primaryError = err instanceof Error ? err : new Error(String(err?.message ?? err));
    if (DARAJA_ERROR_RE.test(primaryError.message)) throw primaryError;
    console.warn("[STK] Supabase path failed, trying Vercel function:", primaryError.message);
  }

  // Vercel function fallback
  try {
    return await tryVercelFunction(payload);
  } catch (fallbackErr: any) {
    const fallbackMsg =
      fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr?.message ?? fallbackErr);
    const bestMsg = DARAJA_ERROR_RE.test(fallbackMsg)
      ? fallbackMsg
      : primaryError?.message || fallbackMsg;
    throw new Error(bestMsg);
  }
};
