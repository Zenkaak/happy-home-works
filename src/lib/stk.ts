import { supabase } from "@/integrations/supabase/client";

type InitiateStkPayload = {
  phone: string;
  amount: number;
  transaction_id: string;
  account_ref: string;
};

// ---------------------------------------------------------------------------
// Path 1 — Supabase edge function (primary)
// ---------------------------------------------------------------------------
async function trySupabaseFunction(payload: InitiateStkPayload) {
  const { data, error } = await supabase.functions.invoke("initiate-stk", {
    body: payload,
  });
  if (error) throw error;
  // ok: false means the function ran but Daraja rejected it (e.g. wrong PIN,
  // cancelled). Propagate the specific message so the user sees it.
  if (data?.ok === false) throw new Error(data.error || "STK push failed");
  if (data?.error) throw new Error(data.error);
  if (!data?.success) throw new Error("STK push was not accepted");
  return data;
}

// ---------------------------------------------------------------------------
// Path 2 — Vercel serverless function (fallback)
// Called only when the Supabase function is unavailable / throws a network
// or non-Daraja error. Both paths use the same Supabase callback URL, so
// order completion is always handled the same way.
// ---------------------------------------------------------------------------
async function tryVercelFunction(payload: InitiateStkPayload) {
  const res = await fetch("/api/initiate-stk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data: any = await res.json().catch(() => ({}));
  if (data?.ok === false) throw new Error(data.error || "STK push failed");
  if (data?.error) throw new Error(data.error);
  if (!data?.success) throw new Error("STK push failed (backup path)");
  return data;
}

// ---------------------------------------------------------------------------
// Public export — tries Supabase first, falls back to Vercel automatically.
// Daraja-level errors (insufficient balance, user cancelled, wrong PIN, etc.)
// are surfaced immediately from whichever path responds first — they are NOT
// retried on the backup, since that would trigger a second STK prompt.
// ---------------------------------------------------------------------------
const DARAJA_ERRORS = /cancelled|insufficient|wrong pin|pin|timed out|unresolved|blocked|agent/i;

export const initiateStkPush = async (payload: InitiateStkPayload) => {
  let primaryError: Error | null = null;

  try {
    return await trySupabaseFunction(payload);
  } catch (err: any) {
    primaryError = err instanceof Error ? err : new Error(String(err?.message || err));

    // If it's a Daraja-level rejection, don't bother trying the backup —
    // the backup would hit the same Daraja result and just send a second prompt.
    if (DARAJA_ERRORS.test(primaryError.message)) {
      throw primaryError;
    }

    console.warn("[STK] Supabase path failed, trying Vercel fallback:", primaryError.message);
  }

  try {
    return await tryVercelFunction(payload);
  } catch (fallbackErr: any) {
    const fallbackMsg =
      fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr?.message || fallbackErr);

    // Surface the most specific error between the two attempts
    const bestMsg =
      DARAJA_ERRORS.test(fallbackMsg)
        ? fallbackMsg
        : primaryError?.message || fallbackMsg;

    throw new Error(bestMsg);
  }
};
