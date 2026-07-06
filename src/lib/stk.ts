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
// Path 1 — Vercel function (PRIMARY — fast, always deployed)
// Returns checkoutId so the frontend can set stk_checkout_id on the transaction.
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
// Path 2 — Supabase edge function (FALLBACK)
// The Supabase function sets stk_checkout_id internally; still return it
// so the frontend can do a redundant write for safety.
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
// Daraja-level errors — don't retry (would trigger a second STK prompt)
// ---------------------------------------------------------------------------
const DARAJA_ERROR_RE = /cancelled|insufficient|wrong pin|timed out|unresolved|blocked/i;

export const initiateStkPush = async (payload: InitiateStkPayload): Promise<StkResult> => {
  let primaryError: Error | null = null;

  // Try Vercel first
  try {
    return await tryVercelFunction(payload);
  } catch (err: any) {
    primaryError = err instanceof Error ? err : new Error(String(err?.message ?? err));
    if (DARAJA_ERROR_RE.test(primaryError.message)) throw primaryError;
    console.warn("[STK] Vercel path failed, falling back to Supabase:", primaryError.message);
  }

  // Supabase fallback
  try {
    return await trySupabaseFunction(payload);
  } catch (fallbackErr: any) {
    const fallbackMsg =
      fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr?.message ?? fallbackErr);
    const bestMsg = DARAJA_ERROR_RE.test(fallbackMsg)
      ? fallbackMsg
      : primaryError?.message || fallbackMsg;
    throw new Error(bestMsg);
  }
};
