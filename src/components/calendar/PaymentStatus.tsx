
import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDay, calculatePaymentAmount } from "@/utils/schedulerUtils";
import { useAuth } from "@/contexts/AuthContext";
import PaymentModal from "@/components/PaymentModal";
import { markPaymentStatus } from "@/utils/api/participantApi";
import { hasPendingPaymentRequest } from "@/utils/api/paymentRequestApi";
import { toast } from "sonner";
import { Check, Clock, CreditCard } from "lucide-react";
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
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
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
          Thành viên cứng
        </Badge>
      </div>
    );
  }

  // For regular members: calculate the full amount (court fee + extras)
  const amountToPay = calculatePaymentAmount(day, user.id);

  // Check for pending payment request
  useEffect(() => {
    const checkPendingRequest = async () => {
      if (!hasPaid && user) {
        const pending = await hasPendingPaymentRequest(day.id, user.id);
        setHasPendingRequest(pending);
      }
    };

    checkPendingRequest();
  }, [day.id, user.id, hasPaid]);

  // If already paid, show appropriate status
  if (hasPaid) {
    return (
      <div className="flex items-center justify-between">
        <Badge className="bg-green-500 hover:bg-green-600 flex items-center gap-1.5">
          <Check className="h-3 w-3" />
          Đã thanh toán
        </Badge>
      </div>
    );
  }

  // If has pending request, show pending status
  if (hasPendingRequest) {
    return (
      <div className="flex items-center gap-1">
        <Badge className="bg-yellow-500 hover:bg-yellow-600 flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          Chờ duyệt
        </Badge>
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

  // Handle payment modal success
  const handlePaymentRequested = () => {
    setHasPendingRequest(true);
  };

  // Show payment controls if payment is needed
  return (
    <div className="flex items-center gap-1">
      {/* Payment request button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="border-badminton text-badminton hover:bg-badminton/10"
              onClick={() => setPaymentModalOpen(true)}
            >
              <CreditCard className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Thanh toán</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

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

      {/* Payment Modal */}
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        dayId={day.id}
        dayDate={day.date}
        amount={amountToPay}
        onPaymentRequested={handlePaymentRequested}
      />
    </div>
  );
};

export default PaymentStatus;
