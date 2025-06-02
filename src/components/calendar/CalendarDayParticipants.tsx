import React, { useState } from "react";
import {
  CalendarDay,
  Member,
  getParticipantCount,
  calculatePaymentAmount,
  formatCurrency,
} from "@/utils/schedulerUtils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Clock, X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import ClickableAvatar from "@/components/ClickableAvatar";
import { useIsMobile } from "@/hooks/use-mobile";
import PaymentStatus from "./PaymentStatus";
import { useAuth } from "@/contexts/AuthContext";
import { toggleAttendance } from "@/utils/api/participantApi";
import { toast } from "sonner";

interface CalendarDayParticipantsProps {
  day: CalendarDay;
  members: Member[];
  onUpdateDay: (day: CalendarDay) => void;
}

export const CalendarDayParticipants: React.FC<
  CalendarDayParticipantsProps
> = ({ day, members, onUpdateDay }) => {
  const isMobile = useIsMobile();
  const { user, profile } = useAuth();
  const isAdmin = profile?.is_admin === true;
  const [loadingRemove, setLoadingRemove] = useState<string | null>(null);

  // Helper to determine payment status text
  const getPaymentStatusText = (member: Member, isPaid: boolean) => {
    if (member.isCore) {
      return (
        <span className="flex items-center gap-1">
          <Check className="h-3 w-3" />
          Thành viên cứng
        </span>
      );
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

  // Handle removing a participant
  const handleRemoveParticipant = async (
    memberId: string,
    memberName: string
  ) => {
    if (!isAdmin) {
      toast.error("Chỉ admin mới có thể xóa thành viên khỏi buổi tập");
      return;
    }

    try {
      setLoadingRemove(memberId);

      // Use toggleAttendance to remove the participant (they are currently participating)
      const result = await toggleAttendance(day.id, memberId, true); // true means they are currently participating, so we want to remove them

      if (result.success) {
        // Update the day data
        onUpdateDay({
          ...day,
          members: day.members.filter((id) => id !== memberId),
          slots: day.slots.filter((slot) => slot[0] !== memberId),
          paidMembers: day.paidMembers.filter((id) => id !== memberId),
        });

        toast.success(`Đã xóa ${memberName} khỏi buổi tập`);
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Error removing participant:", error);
      toast.error("Có lỗi xảy ra khi xóa thành viên");
    } finally {
      setLoadingRemove(null);
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
                    className={`flex items-center gap-2 p-2 rounded-lg w-full transition-all ${getBadgeStyle()} relative group`}
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

                        <div className="flex items-center gap-1">
                          {memberId === user?.id && (
                            <PaymentStatus
                              day={day}
                              onUpdateDay={onUpdateDay}
                            />
                          )}

                          {/* Remove button - only show for admin */}
                          {isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                  disabled={loadingRemove === memberId}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Xóa thành viên khỏi buổi tập
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Bạn có chắc chắn muốn xóa{" "}
                                    <strong>{member.name}</strong> khỏi buổi tập
                                    này không? Hành động này sẽ xóa thông tin
                                    tham gia và thanh toán của họ.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      handleRemoveParticipant(
                                        memberId,
                                        member.name
                                      )
                                    }
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Xóa
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
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

                        {/* Remove button for mobile - only show for admin */}
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                disabled={loadingRemove === memberId}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Xóa thành viên
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Xóa <strong>{member.name}</strong> khỏi buổi
                                  tập này?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Hủy</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleRemoveParticipant(
                                      memberId,
                                      member.name
                                    )
                                  }
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Xóa
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </>
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
