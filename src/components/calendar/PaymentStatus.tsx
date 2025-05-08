import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarDay,
  calculatePaymentAmount,
  formatCurrency,
  getParticipantCount,
  getTotalExtraExpenses,
  getTotalParticipantsInDay,
  getMemberExpensesCredit,
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

/**
 * Calculate the amount a core member needs to pay for extra expenses only
 */
function calculateCoreUserExtraPayment(
  day: CalendarDay,
  userId: string
): number {
  if (!day.extraExpenses || day.extraExpenses.length === 0) return 0;

  // Calculate user's share of extra expenses
  const totalParticipants = getTotalParticipantsInDay(day);
  if (totalParticipants === 0) return 0;

  const participantCount = getParticipantCount(day, userId);
  const totalExtraExpenses = getTotalExtraExpenses(day);
  const extraExpensesPerPerson = totalExtraExpenses / totalParticipants;
  const userExtraShare = extraExpensesPerPerson * participantCount;

  // Calculate user's expenses contribution (credit)
  const expensesCredit = getMemberExpensesCredit(day, userId);

  // If user contributed more than their share, nothing to pay
  if (expensesCredit >= userExtraShare) return 0;

  // Otherwise, return the difference
  return userExtraShare - expensesCredit;
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

  // For core members: calculate only the extra expenses they need to pay
  // For regular members: calculate the full amount (court fee + extras)
  const amountToPay = isCore
    ? calculateCoreUserExtraPayment(day, user.id)
    : calculatePaymentAmount(day, user.id);

  // Determine if payment is required
  const needsPayment = isCore
    ? amountToPay > 0 // Core members need to pay only if they have extra expenses share
    : !hasPaid; // Regular members need to pay if not marked as paid

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

  // If payment is not needed, show appropriate status
  if (!needsPayment) {
    return (
      <div className="flex items-center justify-between">
        <Badge className="bg-green-500 hover:bg-green-600 flex items-center gap-1.5">
          <Check className="h-3 w-3" />
          {isCore ? "Đã thanh toán (thành viên cứng)" : "Đã thanh toán"}
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

  // Show payment controls if payment is needed
  return (
    <div className="flex items-center justify-between gap-2">
      <Badge
        variant="outline"
        className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1.5"
      >
        <Clock className="h-3 w-3" />
        {isCore
          ? `Còn phí phát sinh: ${formatCurrency(amountToPay)}`
          : "Chưa thanh toán"}
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
