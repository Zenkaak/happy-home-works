import { supabase } from "@/integrations/supabase/client";

type InitiateStkPayload = {
  phone: string;
  amount: number;
  transaction_id: string;
  account_ref: string;
};

export const initiateStkPush = async (payload: InitiateStkPayload) => {
  const { data, error } = await supabase.functions.invoke("initiate-stk", {
    body: payload,
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  if (!data?.success) throw new Error("STK push was not accepted. Please try again.");

  return data;
};