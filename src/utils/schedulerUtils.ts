
import { toast } from "sonner";
import { ExtraExpense } from "./apiUtils";

export interface Member {
  id: string;
  name: string;
  isCore: boolean;
  avatarUrl: string | undefined;
}

export interface CalendarDay {
  id: string;
  date: string;
  dayOfWeek: number;
  isActive: boolean;
  members: string[];
  paidMembers: string[];
  slots: [string, number][];
  maxMembers: number;
  sessionCost: number;
  sessionTime: string;
  extraExpenses?: ExtraExpense[];
}

// Interface for participant count mapping
export interface ParticipantCount {
  userId: string;
  count: number;
}

// Calculate cost per person per day
export const calculateCostPerPerson = (
  days: CalendarDay[],
  memberId: string
): { totalDays: number; totalCost: number } => {
  const participatingDays = days.filter(
    (day) => day.isActive && day.members.includes(memberId)
  );

  let totalCost = 0;

  participatingDays.forEach((day) => {
    if (day.members.length > 0) {
      // Get total participant count for this day
      let totalParticipants = getTotalParticipantsInDay(day);

      // Calculate session cost per person
      const sessionCostPerPerson = (day.sessionCost || 260000) / totalParticipants;
      
      // Get participant count for this member
      const memberParticipantCount = getParticipantCount(day, memberId);
      
      // Calculate basic session cost for this member
      const basicCost = sessionCostPerPerson * memberParticipantCount;
      
      // Calculate extra expenses share
      const extraExpensesTotal = getTotalExtraExpenses(day);
      const extraExpensesPerPerson = totalParticipants > 0 ? extraExpensesTotal / totalParticipants : 0;
      
      // Calculate member's contribution to extra expenses
      const extraExpenseShare = extraExpensesPerPerson * memberParticipantCount;
      
      // Calculate credit for expenses added by this member
      const memberExpensesCredit = getMemberExpensesCredit(day, memberId);
      
      // Final cost calculation
      const finalCost = basicCost + extraExpenseShare - memberExpensesCredit;
      
      totalCost += finalCost;
    }
  });

  return {
    totalDays: participatingDays.length,
    totalCost,
  };
};

// Get total participants in a day
export const getTotalParticipantsInDay = (day: CalendarDay): number => {
  return day.slots.reduce((total, slot) => total + slot[1], 0);
};

// Get participant count for a specific member
export const getParticipantCount = (day: CalendarDay, userId: string): number => {
  const slot = day.slots.find((s) => s[0] === userId);
  return slot ? slot[1] : 0;
};

// Get total extra expenses for a day
export const getTotalExtraExpenses = (day: CalendarDay): number => {
  if (!day.extraExpenses) return 0;
  return day.extraExpenses.reduce((total, expense) => total + expense.amount, 0);
};

// Get credit for expenses added by a member
export const getMemberExpensesCredit = (day: CalendarDay, userId: string): number => {
  if (!day.extraExpenses) return 0;
  return day.extraExpenses
    .filter(expense => expense.userId === userId)
    .reduce((total, expense) => total + expense.amount, 0);
};

// Calculate payment amount for a member for a specific day
export const calculatePaymentAmount = (day: CalendarDay, userId: string): number => {
  if (!day.members.includes(userId)) return 0;

  const totalParticipants = getTotalParticipantsInDay(day);
  if (totalParticipants === 0) return 0;

  const memberParticipantCount = getParticipantCount(day, userId);
  
  // Basic session cost
  const sessionCostPerPerson = (day.sessionCost || 260000) / totalParticipants;
  const basicCost = sessionCostPerPerson * memberParticipantCount;
  
  // Extra expenses share
  const extraExpensesTotal = getTotalExtraExpenses(day);
  const extraExpensesPerPerson = totalParticipants > 0 ? extraExpensesTotal / totalParticipants : 0;
  const extraExpenseShare = extraExpensesPerPerson * memberParticipantCount;
  
  // Credit for expenses added by this member
  const memberExpensesCredit = getMemberExpensesCredit(day, userId);
  
  // Final payment amount
  return basicCost + extraExpenseShare - memberExpensesCredit;
};

// Add member to a specific day
export const addMemberToDay = (
  days: CalendarDay[],
  dayIndex: number,
  memberId: string
): CalendarDay[] => {
  const updatedDays = [...days];
  const day = updatedDays[dayIndex];

  if (day.members.length >= day.maxMembers) {
    toast.error(`Đã đạt giới hạn ${day.maxMembers} người cho ngày này`);
    return days;
  }

  if (!day.members.includes(memberId)) {
    updatedDays[dayIndex] = {
      ...day,
      members: [...day.members, memberId],
    };
  }

  return updatedDays;
};

// Remove member from a specific day
export const removeMemberFromDay = (
  days: CalendarDay[],
  dayIndex: number,
  memberId: string
): CalendarDay[] => {
  const updatedDays = [...days];
  const day = updatedDays[dayIndex];

  updatedDays[dayIndex] = {
    ...day,
    members: day.members.filter((id) => id !== memberId),
  };

  return updatedDays;
};

// Format currency to VND
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(amount);
};

// Get day name in Vietnamese
export const getDayName = (dayOfWeek: number): string => {
  const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  return days[dayOfWeek];
};

// Format date to dd/MM
export const formatDate = (date: string): string => {
  const dateObj = new Date(date);
  const day = dateObj.getDate();
  const month = dateObj.getMonth() + 1;
  return `${day < 10 ? "0" + day : day}/${month < 10 ? "0" + month : month}`;
};
