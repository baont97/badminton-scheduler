
import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarDay,
  calculatePaymentAmount,
  formatCurrency,
} from "@/utils/schedulerUtils";
import { useAuth } from "@/contexts/AuthContext";
import MomoPaymentButton from "@/components/MomoPaymentButton";
import { markPaymentStatus } from "@/utils/api/participantApi";
import { toast } from "sonner";
import { Check, Clock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PaymentStatusProps {
  day: CalendarDay;
  onUpdateDay: (day: CalendarDay) => void;
}

export const PaymentStatus: React.FC<PaymentStatusProps> = ({
  day,
  onUpdateDay,
}) => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const isAdmin = profile?.is_admin === true;

  if (!user) return null;

  // Check if the user is a core member
  const isCore = profile?.is_core === true;

  // Check if the user is participating in this day
  const isParticipating = day.members.includes(user.id);
  if (!isParticipating) return null;

  // Check if already paid
  const hasPaid = day.paidMembers.includes(user.id);

  // Core members are always marked as paid
  if (isCore) {
    return (
      <div className="flex items-center justify-between">
        <Badge className="bg-green-500 hover:bg-green-600 flex items-center gap-1.5">
          <Check className="h-3 w-3" />
          Đã thanh toán (thành viên cứng)
        </Badge>

        {isAdmin && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => {
                    // TODO: Add logic to mark as unpaid
                  }}
                >
                  Hủy TT
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Hủy trạng thái thanh toán</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  }

  // For regular members: calculate the full amount (court fee + extras)
  const amountToPay = calculatePaymentAmount(day, user.id);

  // If already paid, show appropriate status
  if (hasPaid) {
    return (
      <div className="flex items-center justify-between">
        <Badge className="bg-green-500 hover:bg-green-600 flex items-center gap-1.5">
          <Check className="h-3 w-3" />
          Đã thanh toán
        </Badge>

        {isAdmin && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => {
                    // TODO: Add logic to mark as unpaid
                  }}
                >
                  Hủy TT
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Hủy trạng thái thanh toán</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  }

  // Handle manual payment marking (admin only)
  const handleMarkAsPaid = async () => {
    if (!isAdmin) return;

    setLoading(true);
    try {
      const success = await markPaymentStatus(day.id, user.id, true);

      if (success) {
        toast.success("Đã đánh dấu đã thanh toán");

        // Update the day data
        onUpdateDay({
          ...day,
          paidMembers: [...day.paidMembers, user.id],
        });
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

  // Handle payment success
  const handlePaymentSuccess = () => {
    // Update the day data
    onUpdateDay({
      ...day,
      paidMembers: [...day.paidMembers, user.id],
    });
  };

  // Show payment controls if payment is needed
  return (
    <div className="flex items-center justify-between gap-2">
      <Badge
        variant="outline"
        className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1.5"
      >
        <Clock className="h-3 w-3" />
        Chưa thanh toán
      </Badge>

      <div className="flex items-center gap-1">
        {/* Only show MoMo payment button if day.can_pay is true */}
        {day.can_pay && (
          <MomoPaymentButton
            dayId={day.id}
            dayDate={day.date}
            amount={amountToPay}
            onPaymentSuccess={handlePaymentSuccess}
          />
        )}

        {/* Admin can mark as paid manually */}
        {isAdmin && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="border-green-500 text-green-500 hover:bg-green-50"
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

export default PaymentStatus;
