// src/utils/momoApiUtils.ts
import { supabase } from "@/integrations/supabase/client";

// Interface cho thông tin thanh toán MoMo
export interface MomoPaymentInfo {
  orderId: string;
  requestId: string;
  payUrl: string;
  success: boolean;
  message: string;
}

// Hàm tạo thanh toán MoMo
export async function createMomoPayment(
  dayId: string,
  dayDate: string,
  amount: number
): Promise<MomoPaymentInfo> {
  try {
    // Tạo mã orderId ngẫu nhiên
    const orderId = `MM_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // Chuyển amount thành số nguyên (VND không có phần thập phân)
    const amountInteger = Math.round(amount);

    const response = await supabase.functions.invoke(
      "momo-payment/create-payment",
      {
        body: {
          amount: amountInteger,
          orderId: orderId,
          orderInfo: `Thanh toán buổi đánh cầu lông ${dayDate}`,
          dayId: dayId,
          redirectUrl: window.location.origin + "/payment-result",
        },
      }
    );

    if (response.error) {
      throw new Error(response.error.message || "Không thể tạo thanh toán");
    }

    return response.data as MomoPaymentInfo;
  } catch (error) {
    console.error("Error creating MoMo payment:", error);
    throw error;
  }
}

// Hàm kiểm tra trạng thái thanh toán
export async function checkMomoPaymentStatus(orderId: string): Promise<{
  success: boolean;
  participantHasPaid: boolean;
  status: string;
}> {
  try {
    const response = await supabase.functions.invoke(
      "momo-payment/check-payment-status",
      {
        body: { orderId },
      }
    );

    if (response.error) {
      throw new Error(
        response.error.message || "Không thể kiểm tra thanh toán"
      );
    }

    return {
      success: response.data.isVerified,
      participantHasPaid: response.data.participantHasPaid,
      status: response.data.status,
    };
  } catch (error) {
    console.error("Error checking MoMo payment status:", error);
    throw error;
  }
}
