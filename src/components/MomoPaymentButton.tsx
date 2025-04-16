// src/components/MomoPaymentButton.tsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/utils/schedulerUtils";
import { initiateMomoPayment } from "@/utils/momoPayment";

interface MomoPaymentButtonProps {
  dayId: string;
  date: string;
  sessionCost: number;
  className?: string;
  disabled?: boolean;
  isIcon?: boolean;
}

const MomoPaymentButton: React.FC<MomoPaymentButtonProps> = ({
  dayId,
  date,
  sessionCost,
  className = "",
  disabled = false,
  isIcon = true,
}) => {
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  const handlePayment = async () => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để thanh toán");
      return;
    }

    setLoading(true);
    try {
      // Calculate the amount to be paid
      const amount = Math.ceil(sessionCost);

      // Initiate MoMo payment
      const result = await initiateMomoPayment(
        dayId,
        user.id,
        amount,
        `Thanh toán buổi cầu lông ngày ${new Date(date).toLocaleDateString(
          "vi-VN"
        )}`
      );

      if (!result.success || !result.payUrl) {
        throw new Error(result.error || "Không thể khởi tạo thanh toán");
      }

      // Redirect to MoMo payment page
      window.location.href = result.payUrl;
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(error.message || "Có lỗi xảy ra khi thanh toán");
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  };

  if (isIcon) {
    // Icon version of the button for compact display
    return (
      <>
        <Button
          variant="outline"
          size="icon"
          className={`border-pink-500 text-pink-500 hover:bg-pink-50 ${className}`}
          onClick={() => setIsOpen(true)}
          disabled={disabled || loading}
          title="Thanh toán qua MoMo"
        >
          <CreditCard className="h-4 w-4" />
        </Button>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Thanh toán qua MoMo</DialogTitle>
              <DialogDescription>
                Thanh toán buổi cầu lông ngày{" "}
                {new Date(date).toLocaleDateString("vi-VN")}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="flex justify-between mb-4">
                <span className="text-sm font-medium">Số tiền thanh toán:</span>
                <span className="text-base font-semibold text-pink-500">
                  {formatCurrency(sessionCost)}
                </span>
              </div>

              <div className="flex items-center justify-center">
                <img
                  src="/momo-logo.png"
                  alt="MoMo"
                  className="h-16"
                  onError={(e) => {
                    // Fallback to text if image is missing
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                    target.parentElement!.innerHTML +=
                      '<div class="bg-pink-500 text-white px-4 py-2 rounded-md font-bold">MoMo</div>';
                  }}
                />
              </div>

              <p className="text-sm text-center text-muted-foreground mt-4">
                Bạn sẽ được chuyển đến trang thanh toán MoMo để hoàn tất giao
                dịch
              </p>
            </div>

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setIsOpen(false)}
                disabled={loading}
              >
                Hủy
              </Button>
              <Button
                className="bg-pink-500 hover:bg-pink-600"
                onClick={handlePayment}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  "Tiếp tục thanh toán"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Text version of the button
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={`border-pink-500 text-pink-500 hover:bg-pink-50 ${className}`}
        onClick={() => setIsOpen(true)}
        disabled={disabled || loading}
      >
        <CreditCard className="h-4 w-4 mr-2" />
        Thanh toán MoMo
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thanh toán qua MoMo</DialogTitle>
            <DialogDescription>
              Thanh toán buổi cầu lông ngày{" "}
              {new Date(date).toLocaleDateString("vi-VN")}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="flex justify-between mb-4">
              <span className="text-sm font-medium">Số tiền thanh toán:</span>
              <span className="text-base font-semibold text-pink-500">
                {formatCurrency(sessionCost)}
              </span>
            </div>

            <div className="flex items-center justify-center">
              <div className="bg-pink-500 text-white px-6 py-3 rounded-md font-bold text-xl">
                MoMo
              </div>
            </div>

            <p className="text-sm text-center text-muted-foreground mt-4">
              Bạn sẽ được chuyển đến trang thanh toán MoMo để hoàn tất giao dịch
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsOpen(false)}
              disabled={loading}
            >
              Hủy
            </Button>
            <Button
              className="bg-pink-500 hover:bg-pink-600"
              onClick={handlePayment}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                "Tiếp tục thanh toán"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MomoPaymentButton;
