// src/utils/momoPayment.ts
import { supabase } from "@/integrations/supabase/client";

/**
 * Initiates a MoMo payment for a badminton session.
 * @param dayId - The ID of the badminton day
 * @param userId - The ID of the user making the payment
 * @param amount - The payment amount in VND
 * @param orderInfo - Optional order description
 * @returns The payment URL or error information
 */
export async function initiateMomoPayment(
  dayId: string,
  userId: string,
  amount: number,
  orderInfo: string = "Thanh toán buổi đánh cầu lông"
): Promise<{ success: boolean; payUrl?: string; error?: string }> {
  try {
    // Get current session to use in authorization header
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session) {
      return { success: false, error: "Không tìm thấy phiên đăng nhập" };
    }

    // Call our edge function to initiate payment
    const { data, error } = await supabase.functions.invoke(
      "momo-payment/initiate",
      {
        body: {
          dayId,
          userId,
          amount,
          orderInfo,
        },
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      }
    );

    if (error) {
      console.error("Error initiating MoMo payment:", error);
      return {
        success: false,
        error: error.message || "Không thể khởi tạo giao dịch",
      };
    }

    if (!data || !data.payUrl) {
      return {
        success: false,
        error: "Không nhận được URL thanh toán từ MoMo",
      };
    }

    return {
      success: true,
      payUrl: data.payUrl,
    };
  } catch (error: any) {
    console.error("Error in initiateMomoPayment:", error);
    return {
      success: false,
      error: error.message || "Có lỗi xảy ra khi tạo giao dịch",
    };
  }
}

/**
 * Check if a payment is completed
 */
export async function checkPaymentStatus(
  orderId: string
): Promise<{ completed: boolean; status: string }> {
  try {
    const { data, error } = await supabase
      .from("payment_transactions")
      .select("status")
      .eq("order_id", orderId)
      .single();

    if (error || !data) {
      return { completed: false, status: "unknown" };
    }

    return {
      completed: data.status === "completed",
      status: data.status,
    };
  } catch (error) {
    console.error("Error checking payment status:", error);
    return { completed: false, status: "error" };
  }
}
