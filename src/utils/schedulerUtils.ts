import { toast } from "sonner";

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
}

// Interface for participant count mapping
export interface ParticipantCount {
  userId: string;
  count: number;
}

// Calculate cost per person per day
export const calculateCostPerPerson = (
  days: CalendarDay[],
  memberId: string,
  participantCounts: ParticipantCount[] = []
): { totalDays: number; totalCost: number } => {
  const participatingDays = days.filter(
    (day) => day.isActive && day.members.includes(memberId)
  );

  let totalCost = 0;

  participatingDays.forEach((day) => {
    if (day.members.length > 0) {
      // Get total participant count for this day
      let totalParticipants = 0;
      day.members.forEach((userId) => {
        const participantData = participantCounts.find(
          (p) => p.userId === userId
        );
        totalParticipants += participantData ? participantData.count : 1;
      });

      // Get participant count for this member
      const memberParticipantCount =
        participantCounts.find((p) => p.userId === memberId)?.count || 1;

      // Default is 260,000 VND per session divided by number of participants
      const costPerPerson =
        ((day.sessionCost || 260000) / totalParticipants) *
        memberParticipantCount;
      totalCost += costPerPerson;
    }
  });

  return {
    totalDays: participatingDays.length,
    totalCost,
  };
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
