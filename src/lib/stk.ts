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
// Pre-warm — call on page load and when the checkout modal opens so the
// Daraja token is already cached by the time the user hits "Pay".
// Fires both endpoints in parallel, ignores all errors silently.
// ---------------------------------------------------------------------------
export function warmStkEndpoints(): void {
  // Vercel function: explicit GET pre-warm endpoint
  fetch("/api/initiate-stk", { method: "GET" }).catch(() => {});
  // Supabase edge function: GET pre-warm (warms token cache on Deno instance)
  supabase.functions
    .invoke("initiate-stk", { method: "GET" as any })
    .catch(() => {});
}

// ---------------------------------------------------------------------------
// Path 1 — Vercel serverless function (PRIMARY)
// Pre-warmed token makes this respond in ~1s. Confirmed working with
// Safaricom's live Daraja API from Vercel's network.
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
// Slower first call (fetches settings + token), but has service_role access
// and reliable Deno → Safaricom connectivity.
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
// Daraja-level errors that come back FROM the user's M-Pesa interaction.
// Do NOT retry these — they would trigger a second STK prompt on the phone.
// Network/infra errors (timeouts reaching Safaricom servers, connection
// refused, etc.) are intentionally excluded so the fallback path is tried.
// ---------------------------------------------------------------------------
const DARAJA_ERROR_RE = /cancelled|insufficient|wrong pin|unresolved|blocked/i;

export const initiateStkPush = async (payload: InitiateStkPayload): Promise<StkResult> => {
  let primaryError: Error | null = null;

  // Vercel function — primary path. Pre-warmed token makes this ~1 s.
  try {
    return await tryVercelFunction(payload);
  } catch (err: any) {
    primaryError = err instanceof Error ? err : new Error(String(err?.message ?? err));
    if (DARAJA_ERROR_RE.test(primaryError.message)) throw primaryError;
    console.warn("[STK] Vercel path failed, trying Supabase function:", primaryError.message);
  }

  // Supabase edge function — fallback.
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
