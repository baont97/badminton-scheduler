import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CalendarDay,
  formatCurrency,
  calculateExtraExpensesPayment,
} from "@/utils/schedulerUtils";
import { markPaymentStatus } from "@/utils/api/participantApi";
import { toast } from "sonner";
import { Check, AlertCircle } from "lucide-react";
import MomoPaymentButton from "@/components/MomoPaymentButton";

interface CoreMemberPaymentProps {
  day: CalendarDay;
  userId: string;
  onSuccess: () => void;
  isAdmin?: boolean;
}

const CoreMemberPayment: React.FC<CoreMemberPaymentProps> = ({
  day,
  userId,
  onSuccess,
  isAdmin = false,
}) => {
  const [loading, setLoading] = useState(false);

  // Calculate the extra expenses amount that the core member needs to pay
  const extraAmount = calculateExtraExpensesPayment(day, userId);

  // If there's no extra amount to pay, don't show the component
  if (extraAmount <= 0) return null;

  // Handle manual payment marking (admin only)
  const handleMarkAsPaid = async () => {
    if (!isAdmin) return;

    setLoading(true);
    try {
      const success = await markPaymentStatus(day.id, userId, true);

      if (success) {
        toast.success("Đã đánh dấu đã thanh toán");
        onSuccess();
      } else {
        toast.error("Không thể đánh dấu đã thanh toán");
      }
    } catch (error) {
      console.error("Error marking payment:", error);
      toast.error("Có lỗi xảy ra khi đánh dấu thanh toán");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50">
      <div className="flex items-center gap-1.5 text-amber-700">
        <AlertCircle className="h-4 w-4" />
        <span className="font-medium">Chi phí phát sinh</span>
      </div>

      <p className="text-sm text-amber-700">
        Thành viên cứng cần thanh toán chi phí phát sinh:{" "}
        <strong>{formatCurrency(extraAmount)}</strong>
      </p>

      <div className="flex items-center gap-2 mt-1">
        {day.can_pay && (
          <MomoPaymentButton
            dayId={day.id}
            dayDate={day.date}
            amount={extraAmount}
            onPaymentSuccess={onSuccess}
          />
        )}

        {isAdmin && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-green-500 text-green-500 hover:bg-green-50 h-8 w-8 p-0"
                  onClick={handleMarkAsPaid}
                  disabled={loading}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Đánh dấu đã thanh toán</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
};

export default CoreMemberPayment;
