import React, { useState, useEffect } from "react";
import {
  CalendarDay,
  Member,
  getDayName,
  formatDate,
  formatCurrency,
  calculatePaymentAmount,
  getTotalParticipantsInDay,
  getParticipantCount,
  getTotalExtraExpenses,
} from "@/utils/schedulerUtils";
import { toast } from "sonner";
import {
  toggleParticipation,
  markPaymentStatus,
  deleteBadmintonDay,
  generateBadmintonDays,
} from "@/utils/apiUtils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Check,
  X,
  Calendar as CalendarIcon,
  CreditCard,
  RefreshCw,
  Ban,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Receipt } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import BillModal from "@/components/BillModal";
import ClickableAvatar from "@/components/ClickableAvatar";
import ExtraExpenseForm from "@/components/ExtraExpenseForm";

interface CalendarProps {
  days: CalendarDay[];
  members: Member[];
  onUpdateDays: (days: CalendarDay[]) => void;
  currentMonth: number;
  currentYear: number;
  onChangeMonth: (month: number, year: number) => void;
  refreshData: () => void;
}

const Calendar: React.FC<CalendarProps> = ({
  days,
  members,
  onUpdateDays,
  currentMonth,
  currentYear,
  onChangeMonth,
  refreshData,
}) => {
  const [loading, setLoading] = useState(false);
  const [hidePaidDays, setHidePaidDays] = useState(true);
  const { user, profile } = useAuth();
  const isAdmin = profile?.is_admin === true;

  const isPastDay = (date: string): boolean => {
    const now = new Date();
    const dayDate = new Date(date);

    // Set both dates to start of day for date comparison
    now.setHours(0, 0, 0, 0);
    dayDate.setHours(0, 0, 0, 0);

    return dayDate < now;
  };

  const isWithinOneHourOfSession = (day: CalendarDay): boolean => {
    if (!day.sessionTime) return false;

    const [startTime] = day.sessionTime.split("-");
    const [hours, minutes] = startTime.split(":").map(Number);

    const sessionDate = new Date(day.date);
    sessionDate.setHours(hours, minutes, 0, 0);

    const oneHourBeforeSession = new Date(
      sessionDate.getTime() - 60 * 60 * 1000
    );
    const now = new Date();

    return now >= oneHourBeforeSession && now < sessionDate;
  };

  const getRemainingTime = (day: CalendarDay): string | null => {
    if (!day.sessionTime) return null;

    const [startTime] = day.sessionTime.split("-");
    const [hours, minutes] = startTime.split(":").map(Number);

    const sessionDate = new Date(day.date);
    sessionDate.setHours(hours, minutes, 0, 0);

    const now = new Date();
    const diff = sessionDate.getTime() - now.getTime();

    console.log(diff);

    if (diff <= 0) return null;

    const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
    const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hoursLeft > 0) {
      return `${hoursLeft} giờ ${minutesLeft} phút`;
    }
    return `${minutesLeft} phút`;
  };

  const isUserParticipating = (day: CalendarDay): boolean => {
    return user ? day.members.includes(user.id) : false;
  };

  const hasUserPaid = (day: CalendarDay): boolean => {
    return user ? day.paidMembers.includes(user.id) : false;
  };

  const isAfterGameTimeWithBuffer = (
    date: string,
    sessionTime: string
  ): boolean => {
    const gameDate = new Date(date);

    // Extract end time from session_time format (e.g., "19:00-21:00")
    const endTimeString = sessionTime.split("-")[1]?.trim() || "21:00"; // Default to 21:00
    const [hours, minutes] = endTimeString.split(":").map(Number);

    // Set the game end time
    gameDate.setHours(hours, minutes, 0, 0);

    // Add 2 hours buffer
    gameDate.setHours(gameDate.getHours() + 2);

    // Compare current time with buffered time
    return new Date() > gameDate;
  };

  // Add these state variables to your Calendar component
  const [selectedDayForBill, setSelectedDayForBill] =
    useState<CalendarDay | null>(null);
  const [billModalOpen, setBillModalOpen] = useState(false);

  // Add this function to handle opening the bill modal
  const handleOpenBill = (day: CalendarDay) => {
    setSelectedDayForBill(day);
    setBillModalOpen(true);
  };

  const handleUpdateDay = (updatedDay: CalendarDay) => {
    const updatedDays = days.map((day) =>
      day.id === updatedDay.id ? updatedDay : day
    );
    onUpdateDays(updatedDays);
  };

  const handleToggleParticipation = async (
    dayIndex: number,
    participantCount: number = 1
  ) => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để tham gia");
      return;
    }

    const day = days[dayIndex];

    if ((isPastDay(day.date) || !day.isActive) && !isAdmin) {
      toast.error("Không thể thay đổi tham gia cho ngày này");
      return;
    }

    const isMemberInDay = day.members.includes(user.id);
    const isUserCoreMember = members.some((m) => m.id === user?.id && m.isCore);

    // Check if user is trying to cancel within 1 hour of session start
    if (isMemberInDay && isWithinOneHourOfSession(day) && !isAdmin) {
      toast.error(
        "Không thể hủy tham gia trong vòng 1 tiếng trước giờ đánh cầu"
      );
      return;
    }

    const currentTotal = getTotalParticipantsInDay(day);

    const userCurrentCount = isMemberInDay
      ? getParticipantCount(day, user.id)
      : 0;
    const newTotal = isMemberInDay
      ? currentTotal - userCurrentCount
      : currentTotal + participantCount;

    if (!isMemberInDay && newTotal > day.maxMembers) {
      toast.error(`Đã đạt giới hạn ${day.maxMembers} người cho ngày này`);
      return;
    }

    setLoading(true);

    const success = await toggleParticipation(
      day.id,
      user.id,
      isMemberInDay,
      participantCount
    );

    if (success) {
      const updatedDays = [...days];
      const actualDayIndex = days.findIndex((d) => d.id === day.id);

      if (isMemberInDay) {
        // If a core member is canceling, track this to prevent auto re-adding
        const removedCoreMembers = isUserCoreMember
          ? [...(day._removedCoreMembers || []), user.id]
          : day._removedCoreMembers;

        updatedDays[actualDayIndex] = {
          ...days[actualDayIndex],
          members: days[actualDayIndex].members.filter((id) => id !== user.id),
          paidMembers: days[actualDayIndex].paidMembers.filter(
            (id) => id !== user.id
          ),
          slots: days[actualDayIndex].slots.filter((s) => s[0] !== user.id),
          _removedCoreMembers: removedCoreMembers,
        };

        if (isUserCoreMember) {
          toast.success(
            "Đã hủy tham gia thành công. Bạn sẽ không được tự động thêm lại cho ngày này."
          );
        }
      } else {
        // If a core member is joining again, remove from the removed list
        let removedCoreMembers = day._removedCoreMembers;
        if (isUserCoreMember && removedCoreMembers?.includes(user.id)) {
          removedCoreMembers = removedCoreMembers.filter(
            (id) => id !== user.id
          );
        }

        updatedDays[actualDayIndex] = {
          ...days[actualDayIndex],
          members: [...days[actualDayIndex].members, user.id],
          slots: [...days[actualDayIndex].slots, [user.id, participantCount]],
          _removedCoreMembers: removedCoreMembers,
        };
      }

      onUpdateDays(updatedDays);
    } else {
      toast.error("Có lỗi xảy ra khi cập nhật trạng thái tham gia");
    }

    setLoading(false);
  };

  const handleTogglePaymentStatus = async (dayId: string) => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để thanh toán");
      return;
    }

    const dayIndex = days.findIndex((d) => d.id === dayId);
    if (dayIndex === -1) return;

    const day = days[dayIndex];
    const hasAlreadyPaid = day.paidMembers.includes(user.id);

    setLoading(true);

    const success = await markPaymentStatus(dayId, user.id, !hasAlreadyPaid);

    if (success) {
      const updatedDays = [...days];

      if (hasAlreadyPaid) {
        updatedDays[dayIndex] = {
          ...days[dayIndex],
          paidMembers: days[dayIndex].paidMembers.filter(
            (id) => id !== user.id
          ),
        };
        toast.success("Đã hủy trạng thái thanh toán");
      } else {
        updatedDays[dayIndex] = {
          ...days[dayIndex],
          paidMembers: [...days[dayIndex].paidMembers, user.id],
        };
        toast.success("Đã xác nhận thanh toán");
      }

      onUpdateDays(updatedDays);
    } else {
      toast.error("Có lỗi xảy ra khi cập nhật trạng thái thanh toán");
    }

    setLoading(false);
  };

  const handlePreviousMonth = () => {
    let newMonth = currentMonth - 1;
    let newYear = currentYear;

    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }

    onChangeMonth(newMonth, newYear);
  };

  const handleNextMonth = () => {
    let newMonth = currentMonth + 1;
    let newYear = currentYear;

    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }

    onChangeMonth(newMonth, newYear);
  };

  useEffect(() => {
    const coreMembers = members
      .filter((member) => member.isCore)
      .map((member) => member.id);

    if (coreMembers.length === 0) return;

    let needsUpdate = false;
    const updatedDays = days.map((day) => {
      // Only auto-add core members if they haven't explicitly canceled
      const missingCoreMembers = coreMembers.filter(
        (id) =>
          !day.members.includes(id) &&
          // Check if user hasn't manually removed themselves
          !day._removedCoreMembers?.includes(id)
      );

      if (missingCoreMembers.length > 0) {
        needsUpdate = true;

        const newSlots = [...day.slots];

        const updatedDay = {
          ...day,
          members: [...day.members, ...missingCoreMembers],
          slots: [
            ...newSlots,
            ...missingCoreMembers.map((id) => [id, 1] as [string, number]),
          ],
        };

        missingCoreMembers.forEach((memberId) => {
          toggleParticipation(day.id, memberId, false, 1).catch((error) =>
            console.error(
              `Error auto-adding core member ${memberId} to day ${day.id}:`,
              error
            )
          );
        });

        return updatedDay;
      }

      return day;
    });

    if (needsUpdate) {
      console.log("Auto-adding core members to days");
      onUpdateDays(updatedDays);
    }
  }, [days, members]);

  const getMonthName = (month: number) => {
    return `Tháng ${month}`;
  };

  // Add helper function to check if all members have paid
  const isAllMembersPaid = (day: CalendarDay): boolean => {
    if (day.members.length === 0) return false;
    if (!isPastDay(day.date)) return false;

    return day.members.every((memberId) => {
      const memberData = members.find((m) => m.id === memberId);
      return day.paidMembers.includes(memberId) || memberData?.isCore;
    });
  };

  const handleToggleDayStatus = async (dayId: string) => {
    if (!isAdmin) {
      toast.error("Bạn không có quyền hủy buổi tập");
      return;
    }

    setLoading(true);
    const dayIndex = days.findIndex((d) => d.id === dayId);
    if (dayIndex === -1) return;

    const day = days[dayIndex];

    try {
      const success = await deleteBadmintonDay(dayId);
      if (!success) throw new Error("Failed to update day status");

      const updatedDays = [...days];
      updatedDays[dayIndex] = {
        ...day,
        isActive: false,
      };
      onUpdateDays(updatedDays);
      toast.success("Đã hủy buổi tập thành công");
    } catch (error) {
      console.error("Error updating day status:", error);
      toast.error("Có lỗi xảy ra khi hủy buổi tập");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDays = async () => {
    if (!isAdmin) {
      toast.error("Bạn không có quyền tạo buổi tập");
      return;
    }

    setLoading(true);
    try {
      const generatedDays = await generateBadmintonDays(
        currentYear,
        currentMonth
      );
      if (generatedDays.length > 0) {
        toast.success("Đã tạo buổi tập thành công");
        refreshData();
      } else {
        toast.error("Không thể tạo buổi tập");
      }
    } catch (error) {
      console.error("Error generating days:", error);
      toast.error("Có lỗi xảy ra khi tạo buổi tập");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-2 sm:p-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <h2 className="text-lg font-medium text-center flex gap-2 w-full sm:w-auto justify-center sm:justify-start">
          Lịch Đánh Cầu {getMonthName(currentMonth)}/{currentYear}
          <button
            onClick={refreshData}
            className="hover:rotate-180 transition-transform duration-300"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </h2>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-center">
            <Switch
              id="hide-paid-days"
              checked={hidePaidDays}
              onCheckedChange={setHidePaidDays}
            />
            <Label htmlFor="hide-paid-days" className="text-sm">
              Ẩn ngày đã thanh toán
            </Label>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousMonth}
              disabled={
                !isAdmin &&
                new Date().getMonth() + 1 === currentMonth &&
                new Date().getFullYear() === currentYear
              }
              className="flex-1 sm:flex-none text-sm"
            >
              Tháng trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextMonth}
              className="flex-1 sm:flex-none text-sm"
            >
              Tháng sau
            </Button>
          </div>
        </div>
      </div>

      {days.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 sm:py-12">
          <CalendarIcon className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-4" />
          <p className="text-gray-500 text-center mb-4 text-sm sm:text-base">
            Chưa có buổi tập nào trong tháng này
          </p>
          {isAdmin && (
            <Button
              onClick={handleGenerateDays}
              disabled={loading}
              className="bg-badminton hover:bg-badminton/90 text-sm"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CalendarIcon className="h-4 w-4 mr-2" />
              )}
              Tạo buổi tập
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:gap-6 md:grid-cols-2">
          {days
            .filter((day) => {
              const allPaid = isAllMembersPaid(day);
              return !hidePaidDays || !allPaid;
            })
            .map((day, dayIndex) => {
              const isParticipating = isUserParticipating(day);
              const hasPaid = hasUserPaid(day);
              const isPast = isPastDay(day.date);
              const isDisabled = !day.isActive;

              const totalParticipants = getTotalParticipantsInDay(day);
              const totalExtraExpenses = getTotalExtraExpenses(day);
              const extraExpensesPerPerson =
                totalParticipants > 0
                  ? totalExtraExpenses / totalParticipants
                  : 0;

              return (
                <div
                  key={dayIndex}
                  className={`calendar-day p-3 sm:p-4 relative ${
                    day.isActive ? "calendar-day-active" : "bg-gray-100"
                  } 
                    ${isDisabled ? "opacity-70 cursor-not-allowed" : ""}`}
                >
                  {!day.isActive && (
                    <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center z-10">
                      <span className="text-white font-semibold text-lg">
                        Đã hủy
                      </span>
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
                          onClick={() => handleToggleDayStatus(day.id)}
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
                          width: `${
                            (totalParticipants / day.maxMembers) * 100
                          }%`,
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
                          {formatCurrency(totalExtraExpenses)}
                        </span>
                      </div>
                      <div className="flex justify-between sm:block">
                        <span>1 người: </span>
                        <span className="font-medium">
                          {formatCurrency(
                            calculatePaymentAmount(day, user?.id || "")
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {day.members.map((memberId) => {
                      const member = members.find((m) => m.id === memberId);
                      if (!member) return null;

                      const participantCount = getParticipantCount(
                        day,
                        memberId
                      );
                      const isPaid = day.paidMembers.includes(memberId);

                      return (
                        <TooltipProvider key={memberId}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="relative">
                                <ClickableAvatar
                                  name={member.name}
                                  imageUrl={member.avatarUrl}
                                  size="sm"
                                  className={isPaid ? "opacity-50" : ""}
                                />
                                {participantCount > 1 && (
                                  <Badge
                                    className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                                    variant="default"
                                  >
                                    {participantCount}
                                  </Badge>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">
                                {member.name}
                                {participantCount > 1
                                  ? ` (${participantCount} người)`
                                  : ""}
                                {isPaid ? " - Đã thanh toán" : ""}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>

                  <ExtraExpenseForm
                    day={day}
                    onUpdateDay={(updatedDay) => handleUpdateDay(updatedDay)}
                  />

                  {user && (
                    <div className="mt-4 space-y-2">
                      {isParticipating ? (
                        <div className="flex flex-col gap-2">
                          <div className="text-sm text-center mb-1">
                            <span className="font-medium">
                              Số tiền cần trả:{" "}
                            </span>
                            <span
                              className={`font-semibold ${
                                calculatePaymentAmount(day, user.id) < 0
                                  ? "text-green-600"
                                  : "text-badminton"
                              }`}
                            >
                              {formatCurrency(
                                calculatePaymentAmount(day, user.id)
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground ml-1">
                              ({getParticipantCount(day, user.id)} người)
                            </span>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            className={`w-full ${
                              hasPaid
                                ? "border-green-500 text-green-500 hover:bg-green-50"
                                : "border-badminton text-badminton hover:bg-badminton/10"
                            }`}
                            onClick={() => handleTogglePaymentStatus(day.id)}
                            disabled={loading}
                          >
                            {hasPaid ? (
                              <>
                                <Check className="h-4 w-4 mr-1" /> Đã thanh toán
                              </>
                            ) : (
                              <>
                                <CreditCard className="h-4 w-4 mr-1" /> Xác nhận
                                thanh toán
                              </>
                            )}
                          </Button>

                          {(!isPast || isAdmin) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full border-red-500 text-red-500 hover:bg-red-50"
                              onClick={() =>
                                handleToggleParticipation(dayIndex)
                              }
                              disabled={loading || isDisabled}
                            >
                              <X className="h-4 w-4 mr-1" /> Hủy tham gia
                              {isParticipating && getRemainingTime(day) && (
                                <span className="ml-2 text-xs">
                                  (còn {getRemainingTime(day)})
                                </span>
                              )}
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {(!isPast || isAdmin) && (
                            <>
                              <div className="flex items-center justify-between mb-1">
                                <label
                                  htmlFor={`participant-count-${dayIndex}`}
                                  className="text-sm"
                                >
                                  Số người tham gia:
                                </label>
                                <input
                                  id={`participant-count-${dayIndex}`}
                                  type="number"
                                  min="1"
                                  max={day.maxMembers}
                                  defaultValue="1"
                                  className="w-16 h-8 px-2 border rounded-md text-sm"
                                  onChange={(e) => {
                                    const count = parseInt(e.target.value) || 1;
                                    if (count < 1) e.target.value = "1";
                                    if (count > day.maxMembers)
                                      e.target.value =
                                        day.maxMembers.toString();
                                  }}
                                />
                              </div>

                              <Button
                                className={`w-full ${
                                  day.isActive
                                    ? "bg-badminton hover:bg-badminton/80"
                                    : "bg-gray-400 hover:bg-gray-500"
                                }`}
                                size="sm"
                                onClick={() => {
                                  const input = document.getElementById(
                                    `participant-count-${dayIndex}`
                                  ) as HTMLInputElement;
                                  const count = parseInt(input.value) || 1;
                                  handleToggleParticipation(dayIndex, count);
                                }}
                                disabled={
                                  loading ||
                                  isDisabled ||
                                  totalParticipants >= day.maxMembers
                                }
                              >
                                <CalendarIcon className="h-4 w-4 mr-1" /> Tham
                                gia
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex justify-center">
                    {isAfterGameTimeWithBuffer(day.date, day.sessionTime) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs border-badminton text-badminton hover:bg-badminton/10"
                        onClick={() => handleOpenBill(day)}
                      >
                        <Receipt className="h-3.5 w-3.5 mr-1" />
                        Xem hóa đơn
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}
      {selectedDayForBill && (
        <BillModal
          isOpen={billModalOpen}
          onClose={() => setBillModalOpen(false)}
          day={selectedDayForBill}
          members={members}
        />
      )}
    </div>
  );
};

export default Calendar;
