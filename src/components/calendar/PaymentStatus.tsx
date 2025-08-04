import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDay, calculatePaymentAmount } from "@/utils/schedulerUtils";
import { useAuth } from "@/contexts/AuthContext";
import PaymentModal from "@/components/PaymentModal";
import { hasPendingPaymentRequest } from "@/utils/api/paymentRequestApi";
import { Check, Clock, CreditCard } from "lucide-react";
import { formatCurrency } from "@/utils/schedulerUtils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PaymentStatusProps {
  day: CalendarDay;
}

export const PaymentStatus: React.FC<PaymentStatusProps> = ({ day }) => {
  const { user, profile } = useAuth();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

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
          Cứng
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

  // Handle payment modal success
  const handlePaymentRequested = () => {
    setHasPendingRequest(true);
  };

  // Show payment controls if payment is needed
  return (
    <div className="flex items-center gap-2">
      {/* Amount display */}
      <Badge variant="outline" className="text-xs font-medium">
        {formatCurrency(amountToPay)}
      </Badge>
      
      {/* Payment request button */}
      {day.canPay && (
        <Button
          variant="outline"
          size="sm"
          className="border-badminton text-badminton hover:bg-badminton/10"
          onClick={() => setPaymentModalOpen(true)}
        >
          <CreditCard className="h-3 w-3" />
        </Button>
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
