import React from "react";
import {
  CalendarDay,
  Member,
  getParticipantCount,
  calculatePaymentAmount,
  formatCurrency,
} from "@/utils/schedulerUtils";
import { Badge } from "@/components/ui/badge";
import { Check, Clock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ClickableAvatar from "@/components/ClickableAvatar";
import { useIsMobile } from "@/hooks/use-mobile";
import PaymentStatus from "./PaymentStatus";
import { useAuth } from "@/contexts/AuthContext";

interface CalendarDayParticipantsProps {
  day: CalendarDay;
  members: Member[];
  onUpdateDay: (day: CalendarDay) => void;
}

export const CalendarDayParticipants: React.FC<
  CalendarDayParticipantsProps
> = ({ day, members, onUpdateDay }) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();

  // Helper to determine payment status text
  const getPaymentStatusText = (member: Member, isPaid: boolean) => {
    if (member.isCore) {
      // Core member logic
      if (isPaid) {
        return (
          <span className="flex items-center gap-1">
            <Check className="h-3 w-3" />
            Thành viên cứng
          </span>
        );
      } else {
        return (
          <span className="flex items-center gap-1">
            <Check className="h-3 w-3" />
            Thành viên cứng
          </span>
        );
      }
    } else {
      const amountToPay = calculatePaymentAmount(day, member.id, members);
      const formattedAmount = formatCurrency(amountToPay);
      // Regular member logic
      if (isPaid) {
        return (
          <span className="flex items-center gap-1">
            <Check className="h-3 w-3" />
            Đã thanh toán - {formattedAmount}
          </span>
        );
      } else {
        return (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Chưa thanh toán - {formattedAmount}
          </span>
        );
      }
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {day.members.map((memberId) => {
        const member = members.find((m) => m.id === memberId);
        if (!member) return null;

        const participantCount = getParticipantCount(day, memberId);
        const isPaid = day.paidMembers.includes(memberId) || member.isCore;

        // Determine badge color and style based on payment status
        const getBadgeStyle = () => {
          if (member.isCore) {
            return "bg-green-50 border border-green-200 text-green-700";
          } else {
            return isPaid
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-amber-50 border border-amber-200 text-amber-700";
          }
        };

        return (
          <TooltipProvider key={memberId}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`flex items-center ${
                    isMobile ? "w-[calc(50%-4px)]" : "w-full"
                  }`}
                >
                  <div
                    className={`flex items-center gap-2 p-2 rounded-lg w-full transition-all ${getBadgeStyle()}`}
                  >
                    <div className="relative">
                      <ClickableAvatar
                        name={member.name}
                        imageUrl={member.avatarUrl}
                        size="sm"
                        className={isPaid ? "opacity-80" : ""}
                      />
                      {participantCount > 1 && (
                        <Badge
                          className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                          variant={isPaid ? "default" : "secondary"}
                        >
                          {participantCount}
                        </Badge>
                      )}
                    </div>
                    {!isMobile ? (
                      <>
                        <div className="flex flex-col flex-1">
                          <span className="text-sm font-medium">
                            {member.name}
                          </span>
                          <span className="text-xs">
                            {getPaymentStatusText(member, isPaid)}
                          </span>
                        </div>
                        {memberId === user?.id && (
                          <PaymentStatus day={day} onUpdateDay={onUpdateDay} />
                        )}
                      </>
                    ) : (
                      <div className="ml-1 flex-1 overflow-hidden">
                        <span className="text-xs font-medium block truncate">
                          {member.name}
                        </span>
                        <span className="text-[10px] block">
                          {member.isCore
                            ? "Thành viên cứng"
                            : isPaid
                            ? "Đã TT"
                            : "Chưa TT"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </TooltipTrigger>
              {isMobile && (
                <TooltipContent>
                  <p className="text-xs">
                    {member.name}
                    {participantCount > 1 ? ` (${participantCount} người)` : ""}
                    <br />
                    {formatCurrency(
                      calculatePaymentAmount(day, memberId, members)
                    )}
                  </p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
};
