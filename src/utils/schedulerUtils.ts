export interface Member {
  id: string;
  name: string;
  isCore: boolean;
  avatarUrl: string | null;
}

export interface ExtraExpense {
  id: string;
  dayId: string;
  userId: string;
  userName: string;
  amount: number;
  description: string;
  createdAt: string;
}

export interface Location {
  id: string;
  name: string;
  address?: string | null;
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
  extraExpenses: ExtraExpense[];
  can_pay: boolean;
  _removedCoreMembers?: string[];
  location?: Location | null;
  courtCount?: number;
}

export const getDayName = (dayOfWeek: number): string => {
  const days = [
    "Chủ nhật",
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
  ];
  return days[dayOfWeek];
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

export const getTotalParticipantsInDay = (day: CalendarDay): number => {
  return day.slots.reduce((total, slot) => total + slot[1], 0);
};

export const getParticipantCount = (
  day: CalendarDay,
  memberId: string
): number => {
  return day.slots
    .filter((slot) => slot[0] === memberId)
    .reduce((total, slot) => total + slot[1], 0);
};

export const getTotalExtraExpenses = (day: CalendarDay): number => {
  if (!day.extraExpenses || day.extraExpenses.length === 0) return 0;

  return day.extraExpenses.reduce(
    (total, expense) => total + expense.amount,
    0
  );
};

export const getMemberExpensesCredit = (
  day: CalendarDay,
  memberId: string
): number => {
  if (!day.extraExpenses || day.extraExpenses.length === 0) return 0;

  return day.extraExpenses
    .filter((expense) => expense.userId === memberId)
    .reduce((total, expense) => total + expense.amount, 0);
};

export const calculateCostPerPerson = (
  days: CalendarDay[],
  memberId: string
): { totalDays: number; totalCost: number } => {
  let totalDays = 0;
  let totalCost = 0;
  let totalExpensesCredit = 0;

  days.forEach((day) => {
    if (day.members.includes(memberId)) {
      const participantCount = getParticipantCount(day, memberId);
      totalDays += participantCount;

      const costForDay = calculatePaymentAmount(day, memberId);
      totalCost += costForDay;

      const expensesCredit = getMemberExpensesCredit(day, memberId);
      totalExpensesCredit += expensesCredit;
    }
  });

  return { totalDays, totalCost };
};

// Helper function to check if a date is in the past
export const isPastDay = (date: string): boolean => {
  const now = new Date();
  const dayDate = new Date(date);

  now.setHours(0, 0, 0, 0);
  dayDate.setHours(0, 0, 0, 0);

  return dayDate < now;
};

export const isAllMembersPaid = (
  day: CalendarDay,
  allMembers: Member[]
): boolean => {
  if (day.members.length === 0) return false;
  if (!isPastDay(day.date)) return false;

  return day.members.every((memberId) => {
    const memberData = allMembers.find((m) => m.id === memberId);
    return day.paidMembers.includes(memberId) || memberData?.isCore;
  });
};

/**
 * Calculate the payment amount for a member
 * UPDATED: For core members, only charge them for extra expenses portion
 */
export const calculatePaymentAmount = (
  day: CalendarDay,
  memberId: string,
  allMembers?: Member[]
): number => {
  const isCoreUser = allMembers
    ? allMembers.find((m) => m.id === memberId)?.isCore
    : false;

  const totalParticipants = getTotalParticipantsInDay(day);
  if (totalParticipants === 0) return 0;

  const participantCount = getParticipantCount(day, memberId);

  // Calculate total session cost, accounting for multiple courts
  const totalSessionCost =
    day.courtCount && day.courtCount > 1
      ? day.sessionCost * day.courtCount
      : day.sessionCost;

  const totalExtraExpenses = getTotalExtraExpenses(day);
  const extraExpensesPerPerson = totalExtraExpenses / totalParticipants;

  // For core members, they don't pay for the court fees, only for their share of extras
  if (isCoreUser) {
    const userExpensesContribution = getMemberExpensesCredit(day, memberId);
    const extraExpensesShare = extraExpensesPerPerson * participantCount;

    // If user has contributed more than their share, return a negative amount (credit)
    return extraExpensesShare - userExpensesContribution;
  } else {
    // Regular members pay for court fees and extras
    const costPerSlot = totalSessionCost / totalParticipants;
    const courtCost = costPerSlot * participantCount;
    const extraCost = extraExpensesPerPerson * participantCount;

    // Subtract user's own expense contributions
    const userExpensesContribution = getMemberExpensesCredit(day, memberId);

    return courtCost + extraCost - userExpensesContribution;
  }
};

/**
 * Calculate only the extra expenses portion a member needs to pay
 * This is useful for core members who only need to pay for extras
 */
export const calculateExtraExpensesPayment = (
  day: CalendarDay,
  memberId: string
): number => {
  const totalParticipants = getTotalParticipantsInDay(day);
  if (totalParticipants === 0) return 0;

  const participantCount = getParticipantCount(day, memberId);
  const totalExtraExpenses = getTotalExtraExpenses(day);
  const extraExpensesPerPerson = totalExtraExpenses / totalParticipants;
  const extraExpensesShare = extraExpensesPerPerson * participantCount;

  // Subtract user's expense contributions
  const userExpensesContribution = getMemberExpensesCredit(day, memberId);

  // Return the remaining amount to pay for extras
  // If it's negative, user has paid more than their share
  return extraExpensesShare - userExpensesContribution;
};

/**
 * Determine if a member has remaining payments needed for extra expenses
 */
export const hasRemainingExtraExpenses = (
  day: CalendarDay,
  memberId: string
): boolean => {
  return calculateExtraExpensesPayment(day, memberId) > 0;
};
