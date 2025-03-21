
import { toast } from "@/components/ui/sonner";

export interface Member {
  id: number;
  name: string;
  isCore: boolean;
}

export interface CalendarDay {
  date: Date;
  dayOfWeek: number;
  isActive: boolean;
  members: number[];
  maxMembers: number;
}

// Get all Tuesdays and Fridays in April 2024
export const getAprilTuesdaysAndFridays = (): CalendarDay[] => {
  const days: CalendarDay[] = [];
  const year = 2024;
  const month = 3; // April is 3 (0-indexed)
  
  // Get all days in April
  const date = new Date(year, month, 1);
  
  while (date.getMonth() === month) {
    const dayOfWeek = date.getDay();
    
    // 2 is Tuesday, 5 is Friday
    if (dayOfWeek === 2 || dayOfWeek === 5) {
      days.push({
        date: new Date(date),
        dayOfWeek,
        isActive: true,
        members: [],
        maxMembers: 8
      });
    }
    
    date.setDate(date.getDate() + 1);
  }
  
  return days;
};

// Generate random member names
export const generateMembers = (): Member[] => {
  const names = [
    "Minh", "Hùng", "Tuấn", "Linh", "Hà", "Dũng", 
    "Anh", "Nam", "Hiếu", "Hoàng", "Thảo", "Tùng"
  ];
  
  return names.map((name, index) => ({
    id: index + 1,
    name,
    isCore: index < 3 // First 3 members are core members
  }));
};

// Calculate cost per person per day
export const calculateCostPerPerson = (
  days: CalendarDay[], 
  memberId: number
): { totalDays: number; totalCost: number } => {
  const participatingDays = days.filter(day => 
    day.isActive && day.members.includes(memberId)
  );
  
  let totalCost = 0;
  
  participatingDays.forEach(day => {
    if (day.members.length > 0) {
      // 260,000 VND per session divided by number of participants
      const costPerPerson = 260000 / day.members.length;
      totalCost += costPerPerson;
    }
  });
  
  return {
    totalDays: participatingDays.length,
    totalCost
  };
};

// Add member to a specific day
export const addMemberToDay = (
  days: CalendarDay[],
  dayIndex: number,
  memberId: number
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
      members: [...day.members, memberId]
    };
  }
  
  return updatedDays;
};

// Remove member from a specific day
export const removeMemberFromDay = (
  days: CalendarDay[],
  dayIndex: number,
  memberId: number
): CalendarDay[] => {
  const updatedDays = [...days];
  const day = updatedDays[dayIndex];
  
  updatedDays[dayIndex] = {
    ...day,
    members: day.members.filter(id => id !== memberId)
  };
  
  return updatedDays;
};

// Format currency to VND
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0
  }).format(amount);
};

// Get day name in Vietnamese
export const getDayName = (dayOfWeek: number): string => {
  const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  return days[dayOfWeek];
};

// Format date to dd/MM
export const formatDate = (date: Date): string => {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  return `${day < 10 ? '0' + day : day}/${month < 10 ? '0' + month : month}`;
};
