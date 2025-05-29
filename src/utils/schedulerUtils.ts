
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

// Calculate total money spent (extra expenses)
export const getTotalMoneySpent = (days: CalendarDay[]): number => {
  return days.reduce((total, day) => total + getTotalExtraExpenses(day), 0);
};

// Calculate total money collected (member payments)
export const getTotalMoneyCollected = (
  days: CalendarDay[],
  allMembers: Member[]
): number => {
  return days.reduce((total, day) => {
    const dayTotal = day.paidMembers.reduce((daySum, memberId) => {
      const member = allMembers.find((m) => m.id === memberId);
      if (member?.isCore) return daySum; // Core members don't contribute money
      
      const paymentAmount = calculatePaymentAmount(day, memberId, allMembers);
      return daySum + paymentAmount;
    }, 0);
    return total + dayTotal;
  }, 0);
};

// Calculate balance (money collected - money spent)
export const getMoneyBalance = (
  days: CalendarDay[],
  allMembers: Member[]
): number => {
  const collected = getTotalMoneyCollected(days, allMembers);
  const spent = getTotalMoneySpent(days);
  return collected - spent;
};

export const calculateCostPerPerson = (
  days: CalendarDay[],
  memberId: string,
  allMembers?: Member[]
): { totalDays: number; totalCost: number } => {
  let totalDays = 0;
  let totalCost = 0;

  // Check if user is a core member
  const isCoreUser = allMembers
    ? allMembers.find((m) => m.id === memberId)?.isCore
    : false;

  days.forEach((day) => {
    if (day.members.includes(memberId)) {
      const participantCount = getParticipantCount(day, memberId);
      totalDays += participantCount;

      // Core members don't pay
      if (!isCoreUser) {
        const costForDay = calculatePaymentAmount(day, memberId, allMembers);
        totalCost += costForDay;
      }
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
 * Core members don't pay anything
 * Non-core members pay court fees + 20% extra (minimum 50k)
 */
export const calculatePaymentAmount = (
  day: CalendarDay,
  memberId: string,
  allMembers?: Member[]
): number => {
  const isCoreUser = allMembers
    ? allMembers.find((m) => m.id === memberId)?.isCore
    : false;

  // Core members don't pay
  if (isCoreUser) return 0;

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

  // Calculate court cost per slot for non-core members
  const costPerSlot = totalSessionCost / totalParticipants;
  let courtCost = costPerSlot * participantCount;
  
  // Add 20% extra for non-core members
  courtCost = courtCost * 1.2;
  
  // Minimum 50k if the amount after adding 20% is less than 50k
  if (courtCost < 50000) {
    courtCost = 50000;
  }

  const extraCost = extraExpensesPerPerson * participantCount;

  // Subtract user's own expense contributions
  const userExpensesContribution = getMemberExpensesCredit(day, memberId);

  return courtCost + extraCost - userExpensesContribution;
};
