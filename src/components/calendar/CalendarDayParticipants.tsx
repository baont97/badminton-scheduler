// src/components/Calendar/CalendarDayParticipants.tsx
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

interface CalendarDayParticipantsProps {
  day: CalendarDay;
  members: Member[];
}

export const CalendarDayParticipants: React.FC<
  CalendarDayParticipantsProps
> = ({ day, members }) => {
  const isMobile = useIsMobile();

  return (
    <div className="flex flex-wrap gap-2">
      {day.members.map((memberId) => {
        const member = members.find((m) => m.id === memberId);
        if (!member) return null;

        const participantCount = getParticipantCount(day, memberId);
        const isPaid = day.paidMembers.includes(memberId) || member.isCore;

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
                    className={`flex items-center gap-2 p-2 rounded-lg w-full transition-all ${
                      isPaid
                        ? "bg-green-50 border border-green-200"
                        : "bg-amber-50 border border-amber-200"
                    }`}
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
                          <span
                            className={`text-sm font-medium ${
                              isPaid ? "text-green-700" : "text-amber-700"
                            }`}
                          >
                            {member.name}
                          </span>
                          <span
                            className={`text-xs ${
                              isPaid ? "text-green-600" : "text-amber-600"
                            }`}
                          >
                            {isPaid ? (
                              <span className="flex items-center gap-1">
                                <Check className="h-3 w-3" />
                                {member.isCore
                                  ? "Thành viên cứng"
                                  : "Đã thanh toán"}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Chưa thanh toán
                              </span>
                            )}
                          </span>
                        </div>
                        <div
                          className={`text-xs font-medium rounded-full px-2 py-1 ${
                            isPaid
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {formatCurrency(
                            calculatePaymentAmount(day, memberId)
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="ml-1 flex-1 overflow-hidden">
                        <span className="text-xs font-medium block truncate">
                          {member.name}
                        </span>
                        <span
                          className={`text-[10px] block ${
                            isPaid ? "text-green-600" : "text-amber-600"
                          }`}
                        >
                          {isPaid ? "Đã TT" : "Chưa TT"}
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
                    {formatCurrency(calculatePaymentAmount(day, memberId))}
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
