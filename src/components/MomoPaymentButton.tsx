// src/components/MomoPaymentButton.tsx
import { useState, useEffect } from "react";
import {
  createMomoPayment,
  checkMomoPaymentStatus,
} from "@/utils/momoApiUtils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { RefreshCw, CreditCard } from "lucide-react";

interface MomoPaymentButtonProps {
  dayId: string;
  dayDate: string;
  amount: number;
  onPaymentSuccess: () => void;
  disabled?: boolean;
}

const MomoPaymentButton = ({
  dayId,
  dayDate,
  amount,
  onPaymentSuccess,
  disabled = false,
}: MomoPaymentButtonProps) => {
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<{
    orderId: string;
    payUrl: string;
  } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [checkInterval, setCheckInterval] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup interval khi component unmount
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [checkInterval]);

  const handlePayment = async () => {
    if (amount <= 0) {
      toast.info("Không cần thanh toán cho buổi này");
      return;
    }

    try {
      setLoading(true);

      // Làm tròn số tiền trước khi gửi
      const roundedAmount = Math.round(amount);

      const payment = await createMomoPayment(dayId, dayDate, roundedAmount);

      if (payment.success) {
        setPaymentData({
          orderId: payment.orderId,
          payUrl: payment.payUrl,
        });

        // Mở dialog thanh toán
        setDialogOpen(true);

        // Bắt đầu kiểm tra trạng thái thanh toán mỗi 3 giây
        const intervalId = window.setInterval(async () => {
          try {
            const status = await checkMomoPaymentStatus(payment.orderId);

            if (status.participantHasPaid) {
              // Nếu đã thanh toán thành công
              clearInterval(intervalId);
              setCheckInterval(null);
              setDialogOpen(false);

              // Gọi callback thành công
              onPaymentSuccess();
              toast.success("Thanh toán thành công!");
            } else if (status.status === "Failed") {
              // Nếu thanh toán thất bại
              clearInterval(intervalId);
              setCheckInterval(null);

              toast.error("Thanh toán thất bại, vui lòng thử lại");
            }
            // Các trạng thái khác như "Processing" sẽ tiếp tục kiểm tra
          } catch (error) {
            console.error("Error checking payment status:", error);
          }
        }, 3000);

        setCheckInterval(intervalId);
      } else {
        toast.error(payment.message || "Không thể tạo thanh toán");
      }
    } catch (error) {
      console.error("Error handling MoMo payment:", error);
      toast.error("Có lỗi xảy ra khi tạo thanh toán");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPayment = () => {
    if (checkInterval) {
      clearInterval(checkInterval);
      setCheckInterval(null);
    }
    setDialogOpen(false);
    setPaymentData(null);
  };

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="border-badminton text-badminton hover:bg-badminton/10"
        onClick={handlePayment}
        disabled={loading || disabled}
        title={disabled ? "Chờ admin mở thanh toán" : "Thanh toán qua MoMo"}
      >
        {loading ? (
          <span className="flex items-center">
            <RefreshCw className="h-4 w-4 animate-spin" />
          </span>
        ) : (
          <span className="flex items-center">
            <CreditCard className="h-4 w-4" />
          </span>
        )}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Thanh toán qua MoMo</DialogTitle>
          <DialogDescription>
            Vui lòng quét mã QR hoặc nhấn vào nút bên dưới để thanh toán qua
            MoMo.
          </DialogDescription>

          <div className="flex flex-col items-center justify-center py-4">
            {paymentData?.payUrl && (
              <>
                <div className="mb-4 border rounded p-2 w-full overflow-hidden">
                  <iframe
                    src={paymentData.payUrl}
                    className="w-full h-96 border-none"
                    title="MoMo Payment"
                  ></iframe>
                </div>

                <div className="flex justify-center space-x-4 w-full">
                  <Button variant="outline" onClick={handleCancelPayment}>
                    Hủy thanh toán
                  </Button>

                  <Button
                    className="bg-badminton hover:bg-badminton/80"
                    onClick={() => window.open(paymentData.payUrl, "_blank")}
                  >
                    Mở trang thanh toán
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MomoPaymentButton;
