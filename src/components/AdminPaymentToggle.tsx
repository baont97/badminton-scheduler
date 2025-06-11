
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { toggleDayPaymentStatus } from "@/utils/api";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CalendarDay } from "@/utils/schedulerUtils";

interface AdminPaymentToggleProps {
  day: CalendarDay;
  onUpdateDay: (day: CalendarDay) => void;
}

const AdminPaymentToggle: React.FC<AdminPaymentToggleProps> = ({
  day,
  onUpdateDay,
}) => {
  const [loading, setLoading] = useState(false);

  const handleTogglePaymentStatus = async () => {
    setLoading(true);
    try {
      const success = await toggleDayPaymentStatus(day.id, !day.canPay);
      if (success) {
        toast.success(
          day.canPay
            ? "Đã tắt khả năng thanh toán cho buổi tập này"
            : "Đã bật khả năng thanh toán cho buổi tập này"
        );
        onUpdateDay({
          ...day,
          canPay: !day.canPay,
        });
      } else {
        toast.error("Có lỗi xảy ra khi thay đổi trạng thái thanh toán");
      }
    } catch (error) {
      console.error("Error toggling payment status:", error);
      toast.error("Có lỗi xảy ra khi thay đổi trạng thái thanh toán");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={day.canPay ? "destructive" : "default"}
            size="icon"
            className={!day.canPay ? "bg-badminton hover:bg-badminton/80" : ""}
            onClick={handleTogglePaymentStatus}
            disabled={loading}
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{day.canPay ? "Tắt thanh toán" : "Mở thanh toán"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default AdminPaymentToggle;
