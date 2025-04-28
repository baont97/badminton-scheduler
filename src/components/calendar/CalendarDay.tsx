// src/components/Calendar/CalendarDay.tsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, UserPlus, Receipt, Ban } from "lucide-react";
import {
  CalendarDay as CalendarDayType,
  Member,
  getDayName,
  formatDate,
  getParticipantCount,
  getTotalParticipantsInDay,
  formatCurrency,
  calculatePaymentAmount,
} from "@/utils/schedulerUtils";
import {
  isPastDay,
  isWithinOneHourOfSession,
  isAfterGameTimeWithBuffer,
  useCalendarDayUser,
} from "./utils";
import { CalendarDayParticipants } from "./CalendarDayParticipants";
import { CalendarAdminActions } from "./CalendarAdminActions";
import ExtraExpenseForm from "@/components/ExtraExpenseForm";
import {
  deleteBadmintonDay,
  toggleParticipation,
  markPaymentStatus,
  toggleDayPaymentStatus,
} from "@/utils/apiUtils";
import { toast } from "sonner";
import MomoPaymentButton from "@/components/MomoPaymentButton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CalendarDayProps {
  day: CalendarDayType;
  dayIndex: number;
  members: Member[];
  onUpdateDay: (day: CalendarDayType) => void;
  onOpenBill: (day: CalendarDayType) => void;
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
  const { user, profile, isAdmin, isParticipating, hasPaid } =
    useCalendarDayUser(day);
  const isPast = isPastDay(day.date);
  const isDisabled = !day.isActive;
  const totalParticipants = getTotalParticipantsInDay(day);
  const [participantCount, setParticipantCount] = useState("1");
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);

  const handleToggleParticipation = async (
    participantCount: number = 1,
    userId?: string
  ) => {
    if (!user && !userId) {
      toast.error("Vui lòng đăng nhập để tham gia");
      return;
    }

    const targetUserId = userId || user?.id;
    if (!targetUserId) return;

    const isMemberInDay = day.members.includes(targetUserId);
    const isUserCoreMember = members.some(
      (m) => m.id === targetUserId && m.isCore
    );

    if (!profile?.is_admin && isMemberInDay && isWithinOneHourOfSession(day)) {
      toast.error(
        "Không thể hủy tham gia trong vòng 1 tiếng trước giờ đánh cầu"
      );
      return;
    }

    const currentTotal = getTotalParticipantsInDay(day);
    const userCurrentCount = isMemberInDay
      ? getParticipantCount(day, targetUserId)
      : 0;
    const newTotal = isMemberInDay
      ? currentTotal - userCurrentCount
      : currentTotal + participantCount;

    if (!isMemberInDay && newTotal > day.maxMembers) {
      toast.error(`Đã đạt giới hạn ${day.maxMembers} người cho ngày này`);
      return;
    }

    setLoading(true);

    try {
      const success = await toggleParticipation(
        day.id,
        targetUserId,
        isMemberInDay,
        participantCount
      );

      if (success) {
        let updatedDay = { ...day };

        if (isMemberInDay) {
          const removedCoreMembers = isUserCoreMember
            ? [...(day._removedCoreMembers || []), targetUserId]
            : day._removedCoreMembers;

          updatedDay = {
            ...day,
            members: day.members.filter((id) => id !== targetUserId),
            paidMembers: day.paidMembers.filter((id) => id !== targetUserId),
            slots: day.slots.filter((s) => s[0] !== targetUserId),
            _removedCoreMembers: removedCoreMembers,
          };
        } else {
          let removedCoreMembers = day._removedCoreMembers;
          if (isUserCoreMember && removedCoreMembers?.includes(targetUserId)) {
            removedCoreMembers = removedCoreMembers.filter(
              (id) => id !== targetUserId
            );
          }

          updatedDay = {
            ...day,
            members: [...day.members, targetUserId],
            slots: [...day.slots, [targetUserId, participantCount]],
            _removedCoreMembers: removedCoreMembers,
          };
        }

        onUpdateDay(updatedDay);
        toast.success(
          isMemberInDay
            ? "Đã hủy tham gia thành công"
            : "Đã tham gia thành công"
        );
      } else {
        console.error("Failed to toggle participation");
        toast.error("Có lỗi xảy ra khi cập nhật trạng thái tham gia");
      }
    } catch (error) {
      console.error("Error toggling participation:", error);
      toast.error("Có lỗi xảy ra khi cập nhật trạng thái tham gia");
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePaymentStatus = async () => {
    if (!isAdmin) {
      toast.error("Bạn không có quyền thay đổi trạng thái thanh toán");
      return;
    }

    setLoading(true);

    try {
      const success = await toggleDayPaymentStatus(day.id, !day.can_pay);

      if (success) {
        const updatedDay = {
          ...day,
          can_pay: !day.can_pay,
        };
        onUpdateDay(updatedDay);
        toast.success(day.can_pay ? "Đã khóa thanh toán" : "Đã mở thanh toán");
      } else {
        toast.error("Không thể thay đổi trạng thái thanh toán");
      }
    } catch (error) {
      console.error("Error toggling payment status:", error);
      toast.error("Có lỗi xảy ra khi thay đổi trạng thái thanh toán");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDayStatus = async () => {
    if (!isAdmin) {
      toast.error("Bạn không có quyền hủy buổi tập");
      return;
    }

    setLoading(true);

    try {
      const success = await deleteBadmintonDay(day.id);
      if (!success) throw new Error("Failed to update day status");

      const updatedDay = {
        ...day,
        isActive: false,
      };
      onUpdateDay(updatedDay);
      toast.success("Đã hủy buổi tập thành công");
    } catch (error) {
      console.error("Error updating day status:", error);
      toast.error("Có lỗi xảy ra khi hủy buổi tập");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    if (user) {
      const updatedDay = {
        ...day,
        paidMembers: [...day.paidMembers, user.id],
      };

      onUpdateDay(updatedDay);
    }
  };

  const handleJoinClick = () => {
    setParticipantCount("1");
    setJoinDialogOpen(true);
  };

  const handleConfirmJoin = async () => {
    const count = parseInt(participantCount, 10);
    if (isNaN(count) || count < 1) {
      toast.error("Số lượng không hợp lệ");
      return;
    }
    
    await handleToggleParticipation(count);
    setJoinDialogOpen(false);
  };

  return (
    <div
      className={`calendar-day p-3 sm:p-4 relative ${
        day.isActive ? "calendar-day-active" : "bg-gray-100"
      } 
        ${isDisabled ? "opacity-70 cursor-not-allowed" : ""}`}
    >
      {!day.isActive && (
        <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center z-10">
          <span className="text-white font-semibold text-lg">Đã hủy</span>
        </div>
      )}

      <div className="flex justify-between items-center mb-2 sm:mb-3">
        <div className="flex items-center gap-1 sm:gap-2">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              day.isActive
                ? "bg-badminton text-white"
                : "bg-gray-400 text-white"
            }`}
          >
            {getDayName(day.dayOfWeek)}
          </span>
          {isAdmin && day.isActive && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 sm:px-2 text-red-500 hover:text-red-600 hover:bg-red-50 text-xs sm:text-sm"
              onClick={handleToggleDayStatus}
              disabled={loading}
            >
              <Ban className="h-3 w-3 mr-1" />
              Hủy
            </Button>
          )}
        </div>
        <span className="text-xs sm:text-sm font-semibold">
          {formatDate(day.date)}
        </span>
      </div>

      <div className="mb-2">
        <p className="text-xs text-muted-foreground">
          {totalParticipants}/{day.maxMembers} người tham gia
        </p>
        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ease-out ${
              day.isActive ? "bg-badminton" : "bg-gray-400"
            }`}
            style={{
              width: `${(totalParticipants / day.maxMembers) * 100}%`,
            }}
          ></div>
        </div>
      </div>

      <div className="mb-2 sm:mb-3 bg-badminton/5 rounded-lg p-2 text-xs">
        <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
          <div className="flex justify-between sm:block">
            <span>Sân: </span>
            <span className="font-medium">
              {formatCurrency(day.sessionCost)}
            </span>
          </div>
          <div className="flex justify-between sm:block">
            <span>Phát sinh: </span>
            <span className="font-medium">
              {formatCurrency(
                day.extraExpenses?.reduce(
                  (sum, expense) => sum + expense.amount,
                  0
                ) || 0
              )}
            </span>
          </div>
          <div className="flex justify-between sm:block">
            <span>1 người: </span>
            <span className="font-medium">
              {formatCurrency(calculatePaymentAmount(day, user?.id || ""))}
            </span>
          </div>
        </div>
      </div>

      <CalendarDayParticipants day={day} members={members} />

      <ExtraExpenseForm day={day} onUpdateDay={onUpdateDay} />

      {user && (
        <div className="mt-4">
          <div className="flex justify-end gap-2">
            {isParticipating ? (
              <>
                {(!isPast || isAdmin) && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="border-red-500 text-red-500 hover:bg-red-50"
                    onClick={() => handleToggleParticipation()}
                    disabled={loading || isDisabled}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </>
            ) : (
              !isPast && (
                <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      size="icon"
                      className={`${
                        day.isActive
                          ? "bg-badminton hover:bg-badminton/80"
                          : "bg-gray-400 hover:bg-gray-500"
                      }`}
                      onClick={handleJoinClick}
                      disabled={
                        loading || isDisabled || totalParticipants >= day.maxMembers
                      }
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Tham gia ngày {formatDate(day.date)}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="participants">Số lượng người tham gia</Label>
                        <Input
                          id="participants"
                          type="number"
                          min="1"
                          max={day.maxMembers - totalParticipants}
                          value={participantCount}
                          onChange={(e) => setParticipantCount(e.target.value)}
                        />
                      </div>
                      <Button 
                        className="w-full bg-badminton hover:bg-badminton/90"
                        onClick={handleConfirmJoin}
                        disabled={loading}
                      >
                        Xác nhận
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )
            )}

            {isAfterGameTimeWithBuffer(day.date, day.sessionTime) && (
              <>
                {isParticipating &&
                  !hasPaid &&
                  !members.find((m) => m.id === user?.id)?.isCore && (
                    <MomoPaymentButton
                      dayId={day.id}
                      dayDate={formatDate(day.date)}
                      amount={calculatePaymentAmount(day, user?.id || "")}
                      onPaymentSuccess={handlePaymentSuccess}
                      disabled={loading || !day.can_pay}
                    />
                  )}
                <Button
                  variant="outline"
                  size="icon"
                  className="border-badminton text-badminton hover:bg-badminton/10"
                  onClick={() => onOpenBill(day)}
                >
                  <Receipt className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {isParticipating && user && (
            <div className="text-sm text-center mt-2">
              <span className="font-medium">Số tiền cần trả: </span>
              <span
                className={`font-semibold ${
                  calculatePaymentAmount(day, user.id) < 0
                    ? "text-green-600"
                    : "text-badminton"
                }`}
              >
                {formatCurrency(calculatePaymentAmount(day, user.id))}
              </span>
              <span className="text-xs text-muted-foreground ml-1">
                ({getParticipantCount(day, user.id)} người)
              </span>
            </div>
          )}
        </div>
      )}

      {profile?.is_admin && (
        <div className="mt-3">
          <Button
            variant={day.can_pay ? "destructive" : "default"}
            size="sm"
            className="w-full"
            onClick={handleTogglePaymentStatus}
            disabled={loading}
          >
            {day.can_pay ? "Khóa thanh toán" : "Mở thanh toán"}
          </Button>
          <CalendarAdminActions
            day={day}
            members={members}
            onAddUser={handleToggleParticipation}
          />
        </div>
      )}
    </div>
  );
};
