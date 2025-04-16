// src/hooks/useSyncPaymentStatus.ts
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { checkPaymentStatus } from "@/utils/momoPayment";

/**
 * Hook to check and sync payment status when returning from MoMo payment
 * Returns true when payment is completed successfully
 */
export function useSyncPaymentStatus(): boolean {
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Only run this on initial mount or when URL params change
    const params = new URLSearchParams(location.search);
    const orderId = params.get("orderId");
    const resultCode = params.get("resultCode");

    // If we have MoMo payment parameters and we're not on the payment result page
    if (
      orderId &&
      resultCode &&
      !location.pathname.includes("/payment-result")
    ) {
      // Clear params from URL to avoid processing them on subsequent renders
      const currentPath = location.pathname;
      navigate(currentPath, { replace: true });

      const verifyPayment = async () => {
        try {
          // Check payment status
          if (resultCode === "0") {
            const statusResult = await checkPaymentStatus(orderId);

            if (statusResult.completed) {
              toast.success("Thanh toán thành công", {
                description: "Trạng thái thanh toán đã được cập nhật",
              });
              setPaymentCompleted(true);
            } else {
              // Payment not marked as completed yet
              toast.info("Đang xác nhận thanh toán...");

              // Try again after 2 seconds (IPN might be processing)
              setTimeout(async () => {
                const retryResult = await checkPaymentStatus(orderId);
                if (retryResult.completed) {
                  toast.success("Thanh toán thành công", {
                    description: "Trạng thái thanh toán đã được cập nhật",
                  });
                  setPaymentCompleted(true);
                } else {
                  toast.info("Hệ thống đang xử lý thanh toán của bạn", {
                    description: "Vui lòng đợi trong giây lát",
                  });
                }
              }, 2000);
            }
          } else {
            // Payment failed or canceled
            toast.error("Thanh toán không thành công hoặc đã bị hủy");
          }
        } catch (error) {
          console.error("Error verifying payment:", error);
        }
      };

      verifyPayment();
    }
  }, [location.search, location.pathname, navigate]);

  return paymentCompleted;
}
