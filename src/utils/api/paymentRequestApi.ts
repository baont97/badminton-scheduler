
import { supabase } from "@/integrations/supabase/client";

export interface PaymentRequest {
  id: string;
  day_id: string;
  user_id: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  processed_at: string | null;
  processed_by: string | null;
  notes: string | null;
  profiles?: {
    user_name: string | null;
  } | null;
  badminton_days?: {
    date: string;
    session_time: string;
  } | null;
}

/**
 * Fetch all pending payment requests for admin
 */
export async function fetchPendingPaymentRequests(): Promise<PaymentRequest[]> {
  try {
    const { data, error } = await supabase
      .from("payment_requests")
      .select(`
        *,
        profiles!payment_requests_user_id_fkey (user_name),
        badminton_days!payment_requests_day_id_fkey (date, session_time)
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching payment requests:", error);
      return [];
    }

    return (data || []) as PaymentRequest[];
  } catch (error) {
    console.error("Error in fetchPendingPaymentRequests:", error);
    return [];
  }
}

/**
 * Approve a payment request
 */
export async function approvePaymentRequest(
  requestId: string,
  dayId: string,
  userId: string
): Promise<boolean> {
  try {
    // Start a transaction-like operation
    // 1. Update payment request status
    const { error: updateError } = await supabase
      .from("payment_requests")
      .update({
        status: "approved",
        processed_at: new Date().toISOString(),
        processed_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .eq("id", requestId);

    if (updateError) {
      console.error("Error updating payment request:", updateError);
      return false;
    }

    // 2. Mark participant as paid
    const { error: participantError } = await supabase
      .from("badminton_participants")
      .update({ has_paid: true })
      .eq("day_id", dayId)
      .eq("user_id", userId);

    if (participantError) {
      console.error("Error updating participant payment:", participantError);
      // Try to rollback the payment request update
      await supabase
        .from("payment_requests")
        .update({
          status: "pending",
          processed_at: null,
          processed_by: null,
        })
        .eq("id", requestId);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in approvePaymentRequest:", error);
    return false;
  }
}

/**
 * Reject a payment request
 */
export async function rejectPaymentRequest(
  requestId: string,
  notes?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("payment_requests")
      .update({
        status: "rejected",
        processed_at: new Date().toISOString(),
        processed_by: (await supabase.auth.getUser()).data.user?.id,
        notes: notes || null,
      })
      .eq("id", requestId);

    if (error) {
      console.error("Error rejecting payment request:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in rejectPaymentRequest:", error);
    return false;
  }
}

/**
 * Check if user has pending payment request for a day
 */
export async function hasPendingPaymentRequest(
  dayId: string,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("payment_requests")
      .select("id")
      .eq("day_id", dayId)
      .eq("user_id", userId)
      .eq("status", "pending")
      .maybeSingle();

    if (error) {
      console.error("Error checking pending payment request:", error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error("Error in hasPendingPaymentRequest:", error);
    return false;
  }
}
