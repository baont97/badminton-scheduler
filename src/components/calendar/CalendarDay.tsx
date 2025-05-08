// src/components/calendar/CalendarDay.tsx
import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Clock, MapPin } from "lucide-react";
import { toast } from "sonner";
import { CalendarDayParticipants } from "./CalendarDayParticipants";
import { CalendarAdminActions } from "./CalendarAdminActions";
import {
  formatDate,
  getDayName,
  formatCurrency,
  CalendarDay,
  Member,
  getParticipantCount,
  getTotalParticipantsInDay,
} from "@/utils/schedulerUtils";
import { toggleDayPaymentStatus } from "@/utils/api";
import {
  isWithinOneHourOfSession,
  useCalendarDayUser,
  getRemainingTime,
  isAfterGameTimeWithBuffer,
} from "./utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Import the correct toggleAttendance function
import { toggleAttendance } from "@/utils/api/participantApi";
import ExtraExpenseForm from "../ExtraExpenseForm";

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
  const { user, profile, isAdmin, isParticipating } = useCalendarDayUser(day);

  // Determine if user is a core member
  const isCoreUser = profile?.is_core === true;

  // Core members are always considered paid
  const hasPaid =
    isParticipating && (day.paidMembers.includes(user?.id || "") || isCoreUser);

  const isPastGame = isAfterGameTimeWithBuffer(day.date, day.sessionTime);
  const nearGameTime = isWithinOneHourOfSession(day);
  const remainingTime = getRemainingTime(day);
  const userCanJoin = day.isActive && user && (!isPastGame || isAdmin);
  const participantSlotCount = getParticipantCount(day, user?.id || "");
  const totalParticipants = getTotalParticipantsInDay(day);

  // Calculate total session cost based on court count
  const totalSessionCost =
    day.courtCount && day.courtCount > 1
      ? day.sessionCost * day.courtCount
      : day.sessionCost;

  const handleToggleAttendance = async () => {
    if (!user || loading) return;

    try {
      setLoadingAttendance(true);

      const result = await toggleAttendance(day.id, user.id, isParticipating);
      if (result.success) {
        // If user is a core member and they're joining, add them to paidMembers too
        let updatedPaidMembers = day.paidMembers;
        if (!isParticipating && isCoreUser) {
          updatedPaidMembers = [...updatedPaidMembers, user.id];
        } else if (isParticipating) {
          updatedPaidMembers = updatedPaidMembers.filter(
            (id) => id !== user.id
          );
        }

        onUpdateDay({
          ...day,
          members: isParticipating
            ? day.members.filter((id) => id !== user.id)
            : [...day.members, user.id],
          slots: isParticipating
            ? day.slots.filter((slot) => slot[0] !== user.id)
            : [...day.slots, [user.id, 1]],
          paidMembers: updatedPaidMembers,
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
      } ${dayIndex === 0 ? "mt-0" : ""}`}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium">
              {getDayName(day.dayOfWeek)} {formatDate(day.date)}
            </h3>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {day.courtCount && day.courtCount > 1 && (
              <Badge variant="outline" className="text-xs">
                {day.courtCount} sân
              </Badge>
            )}
            {!day.isActive && (
              <Badge variant="destructive" className="text-xs">
                Đã hủy
              </Badge>
            )}
            {nearGameTime && (
              <Badge className="bg-yellow-500 text-white hover:bg-yellow-600 text-xs">
                Sắp diễn ra ({remainingTime})
              </Badge>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end space-x-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {totalParticipants}/{day.maxMembers}
            </span>
          </div>

          {isParticipating && (
            <Badge
              className={`mt-1 ${
                hasPaid
                  ? "bg-green-500 hover:bg-green-600"
                  : "bg-amber-500 hover:bg-amber-600"
              }`}
            >
              {hasPaid ? "Đã thanh toán" : "Chưa thanh toán"}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pb-2">
        <div className="grid gap-2">
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
            <span>{day.sessionTime}</span>
          </div>

          {day.location && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <div className="font-medium text-sm">{day.location.name}</div>
                {day.location.address && (
                  <div className="text-muted-foreground text-xs">
                    {day.location.address}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center text-sm pt-1">
            <span className="text-muted-foreground">
              Giá: {formatCurrency(totalSessionCost)}
            </span>
            {isParticipating && participantSlotCount > 1 && (
              <Badge variant="outline">x{participantSlotCount}</Badge>
            )}
          </div>
        </div>

        {day.members.length > 0 && (
          <div className="mt-4">
            <CalendarDayParticipants
              day={day}
              members={members}
              onUpdateDay={onUpdateDay}
            />
            <ExtraExpenseForm day={day} onUpdateDay={onUpdateDay} />
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between gap-2 pt-0">
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
                    <span>✕</span>
                  ) : (
                    <span>+</span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isParticipating ? "Hủy tham gia" : "Tham gia"}</p>
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
                  <span>&#9776;</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Chi tiết</p>
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
