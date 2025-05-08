import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, User, Receipt } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatDate,
  getDayName,
  formatCurrency,
  getTotalParticipantsInDay,
  getParticipantCount,
  CalendarDay,
  Member,
} from "@/utils/schedulerUtils";
import {
  isWithinOneHourOfSession,
  useCalendarDayUser,
  getRemainingTime,
  isAfterGameTimeWithBuffer,
} from "./utils";
import { toggleAttendance } from "@/utils/api/participantApi";
import { CalendarDayParticipants } from "./CalendarDayParticipants";
import { CalendarAdminActions } from "./CalendarAdminActions";
import ExtraExpenseForm from "../ExtraExpenseForm";
import PaymentStatus from "./PaymentStatus";

interface CalendarDayProps {
  day: CalendarDay;
  dayIndex: number;
  members: Member[];
  onUpdateDay: (day: CalendarDay) => void;
  onOpenBill: (day: CalendarDay) => void;
  setLoading: (loading: boolean) => void;
  loading: boolean;
}

export const CalendarDayComponent: React.FC<CalendarDayProps> = ({
  day,
  dayIndex,
  members,
  onUpdateDay,
  onOpenBill,
  setLoading,
  loading,
}) => {
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const { user, isAdmin, isParticipating } = useCalendarDayUser(day);

  const isPastGame = isAfterGameTimeWithBuffer(day.date, day.sessionTime);
  const nearGameTime = isWithinOneHourOfSession(day);
  const remainingTime = getRemainingTime(day);
  const userCanJoin = day.isActive && user && (!isPastGame || isAdmin);
  const participantSlotCount = getParticipantCount(day, user?.id || "");
  const totalParticipants = getTotalParticipantsInDay(day);
  const sessionCost =
    day.courtCount > 1 ? day.sessionCost * day.courtCount : day.sessionCost;

  const handleToggleAttendance = async () => {
    if (!user || loading) return;

    try {
      setLoadingAttendance(true);
      const result = await toggleAttendance(day.id, user.id, isParticipating);

      if (result.success) {
        onUpdateDay({
          ...day,
          members: isParticipating
            ? day.members.filter((id) => id !== user.id)
            : [...day.members, user.id],
          slots: isParticipating
            ? day.slots.filter((slot) => slot[0] !== user.id)
            : [...day.slots, [user.id, 1]],
        });
        toast.success(
          isParticipating ? "Đã hủy tham gia" : "Đã đăng ký tham gia"
        );
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Error toggling attendance:", error);
      toast.error("Có lỗi xảy ra khi thực hiện thao tác");
    } finally {
      setLoadingAttendance(false);
    }
  };

  return (
    <Card
      className={`transition-all duration-300 ${
        !day.isActive ? "opacity-60" : ""
      }`}
    >
      {/* Header Section */}
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          {/* Date and Status */}
          <h1 className="text-lg font-bold">
            {getDayName(day.dayOfWeek)} {formatDate(day.date)}
          </h1>

          <div className="mt-1 flex flex-wrap gap-1">
            {!day.isActive && (
              <Badge variant="destructive" className="text-xs">
                Đã hủy
              </Badge>
            )}
            {nearGameTime && (
              <Badge className="bg-yellow-500 text-white text-xs">
                Sắp diễn ra ({remainingTime})
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Content Section */}
      <CardContent>
        <div className="grid grid-flow-row gap-2">
          {/* Participants Count */}
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>
              {totalParticipants}/{day.maxMembers} người
            </span>
          </div>

          {/* Session Time */}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{day.sessionTime}</span>
          </div>

          {/* Location */}
          {day.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>
                {day.location.name} ({day.courtCount} sân)
              </span>
            </div>
          )}

          {/* Price Information */}
          <div>
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <span>{formatCurrency(sessionCost)}</span>
            </div>
            {isParticipating && participantSlotCount > 1 && (
              <Badge variant="outline">x{participantSlotCount}</Badge>
            )}
          </div>
        </div>

        {/* Payment Status - Show only if participating */}
        {isParticipating && user && (
          <div className="mt-2">
            <PaymentStatus day={day} onUpdateDay={onUpdateDay} />
          </div>
        )}

        {/* Participants and Expenses */}
        {day.members.length > 0 && (
          <div className="mt-4 space-y-4">
            <div className="pt-2 border-t">
              <CalendarDayParticipants day={day} members={members} />
            </div>
            <div className="pt-2 border-t">
              <ExtraExpenseForm day={day} onUpdateDay={onUpdateDay} />
            </div>
          </div>
        )}
      </CardContent>

      {/* Actions Footer */}
      <CardFooter className="flex flex-wrap sm:flex-nowrap justify-between gap-2 pt-0">
        {userCanJoin && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isParticipating ? "destructive" : "default"}
                  className={`flex-1 ${
                    isParticipating ? "" : "bg-badminton hover:bg-badminton/80"
                  }`}
                  onClick={handleToggleAttendance}
                  disabled={loadingAttendance}
                >
                  {loadingAttendance ? (
                    <span className="animate-spin">&#8635;</span>
                  ) : isParticipating ? (
                    <span>Hủy tham gia</span>
                  ) : (
                    <span>Tham gia</span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isParticipating ? "Hủy tham gia" : "Tham gia buổi tập"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {day.members.length > 0 && user && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenBill(day)}
                >
                  <span>Chi tiết</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Xem hóa đơn chi tiết</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {isAdmin && (
          <CalendarAdminActions
            day={day}
            members={members}
            setLoading={setLoading}
            onUpdateDay={onUpdateDay}
          />
        )}
      </CardFooter>
    </Card>
  );
};
