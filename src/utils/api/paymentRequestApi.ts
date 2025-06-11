
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

type PaymentStatus = "pending" | "approved" | "rejected" | "all";

/**
 * Fetch payment requests by status
 */
export async function fetchPaymentRequestsByStatus(
  status: PaymentStatus = "pending"
): Promise<PaymentRequest[]> {
  try {
    console.log("Fetching payment requests with status:", status);

    // Try simple query first without complex joins
    let query = supabase
      .from("payment_requests")
      .select("*");

    // Add status filter only if not "all"
    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error("Error fetching payment requests:", error);
      return [];
    }

    console.log("Query successful, data:", data);

    // Fetch user names separately to avoid join issues
    const requestsWithUserNames = await Promise.all(
      (data || []).map(async (request) => {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("user_name")
          .eq("id", request.user_id)
          .single();

        const { data: dayData } = await supabase
          .from("badminton_days")
          .select("date, session_time")
          .eq("id", request.day_id)
          .single();

        return {
          ...request,
          profiles: profileData ? { user_name: profileData.user_name } : null,
          badminton_days: dayData ? { 
            date: dayData.date, 
            session_time: dayData.session_time 
          } : null,
        };
      })
    );

    return requestsWithUserNames as PaymentRequest[];
  } catch (error) {
    console.error("Error in fetchPaymentRequestsByStatus:", error);
    return [];
  }
}

/**
 * Fetch all pending payment requests for admin (backward compatibility)
 */
export async function fetchPendingPaymentRequests(): Promise<PaymentRequest[]> {
  return fetchPaymentRequestsByStatus("pending");
}

/**
 * Debug function to check all payment requests
 */
export async function debugPaymentRequests() {
  try {
    console.log("=== DEBUG: Checking all payment requests ===");

    // Query 1: Raw data
    const { data: rawData, error: rawError } = await supabase
      .from("payment_requests")
      .select("*")
      .order("created_at", { ascending: false });

    console.log("Raw data:", rawData);
    console.log("Raw error:", rawError);

    // Query 2: Count by status
    const { data: statusCount } = await supabase
      .from("payment_requests")
      .select("status")
      .order("status");

    const statusSummary = statusCount?.reduce((acc: any, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});

    console.log("Status summary:", statusSummary);

    // Query 3: Check foreign key relationships
    const { data: joinTest, error: joinError } = await supabase
      .from("payment_requests")
      .select(
        `
        id,
        status,
        user_id,
        day_id,
        profiles(user_name),
        badminton_days(date)
      `
      )
      .limit(1);

    console.log("Join test:", joinTest);
    console.log("Join error:", joinError);

    return rawData;
  } catch (error) {
    console.error("Debug error:", error);
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
