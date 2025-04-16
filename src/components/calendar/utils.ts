// src/components/Calendar/utils.ts
import { CalendarDay, Member } from "@/utils/schedulerUtils";
import { useAuth } from "@/contexts/AuthContext";

export const isPastDay = (date: string): boolean => {
  const now = new Date();
  const dayDate = new Date(date);

  now.setHours(0, 0, 0, 0);
  dayDate.setHours(0, 0, 0, 0);

  return dayDate < now;
};

export const isWithinOneHourOfSession = (day: CalendarDay): boolean => {
  if (!day.sessionTime) return false;

  const [startTime] = day.sessionTime.split("-");
  const [hours, minutes] = startTime.split(":").map(Number);

  const sessionDate = new Date(day.date);
  sessionDate.setHours(hours, minutes, 0, 0);

  const oneHourBeforeSession = new Date(sessionDate.getTime() - 60 * 60 * 1000);
  const now = new Date();

  return now >= oneHourBeforeSession && now < sessionDate;
};

export const getRemainingTime = (day: CalendarDay): string | null => {
  if (!day.sessionTime) return null;

  const [startTime] = day.sessionTime.split("-");
  const [hours, minutes] = startTime.split(":").map(Number);

  const sessionDate = new Date(day.date);
  sessionDate.setHours(hours, minutes, 0, 0);

  const now = new Date();
  const diff = sessionDate.getTime() - now.getTime();

  if (diff <= 0) return null;

  const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
  const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hoursLeft > 0) {
    return `${hoursLeft} giờ ${minutesLeft} phút`;
  }
  return `${minutesLeft} phút`;
};

export const isAfterGameTimeWithBuffer = (
  date: string,
  sessionTime: string
): boolean => {
  const gameDate = new Date(date);

  const endTimeString = sessionTime.split("-")[1]?.trim() || "21:00";
  const [hours, minutes] = endTimeString.split(":").map(Number);

  gameDate.setHours(hours, minutes, 0, 0);

  // Add 2 hour buffer
  gameDate.setHours(gameDate.getHours() + 2);

  return new Date() > gameDate;
};

export const isAllMembersPaid = (
  day: CalendarDay,
  members: Member[]
): boolean => {
  if (day.members.length === 0) return false;
  if (!isPastDay(day.date)) return false;

  return day.members.every((memberId) => {
    const memberData = members.find((m) => m.id === memberId);
    return day.paidMembers.includes(memberId) || memberData?.isCore;
  });
};

// Custom hook to get user-related information for a specific day
export const useCalendarDayUser = (day: CalendarDay) => {
  const { user, profile } = useAuth();
  const isAdmin = profile?.is_admin === true;

  const isParticipating = user ? day.members.includes(user.id) : false;
  const hasPaid = user ? day.paidMembers.includes(user.id) : false;

  return { user, profile, isAdmin, isParticipating, hasPaid };
};
