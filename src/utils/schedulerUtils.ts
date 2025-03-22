
import { toast } from "sonner";

export interface Member {
  id: string;
  name: string;
  isCore: boolean;
}

export interface CalendarDay {
  id: string;
  date: string;
  dayOfWeek: number;
  isActive: boolean;
  members: string[];
  maxMembers: number;
  sessionCost: number;
  sessionTime: string;
}

// Get all Tuesdays and Fridays in April 2025 - this is kept for backwards compatibility
// but will be replaced with dynamic data from the database
export const getAprilTuesdaysAndFridays = (): CalendarDay[] => {
  const days: CalendarDay[] = [];
  const april2025 = new Date(2025, 3, 1); // April is month 3 (0-indexed)
  
  // Add entries for Tuesdays (2) and Fridays (5) in April
  for (let i = 0; i < 30; i++) {
    const currentDate = new Date(april2025);
    currentDate.setDate(april2025.getDate() + i);
    
    // Check if day is Tuesday (2) or Friday (5)
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek === 2 || dayOfWeek === 5) { // Tuesday (2) and Friday (5)
      days.push({
        id: `april2025-${i+1}`,
        date: currentDate.toISOString(),
        dayOfWeek,
        isActive: true,
        members: [],
        maxMembers: 10, // Default max members
        sessionCost: 260000, // Default cost per session
        sessionTime: "19:00-21:00" // Default time
      });
    }
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
    id: `${index + 1}`,
    name,
    isCore: index < 3 // First 3 members are core members
  }));
};

// Calculate cost per person per day
export const calculateCostPerPerson = (
  days: CalendarDay[], 
  memberId: string
): { totalDays: number; totalCost: number } => {
  const participatingDays = days.filter(day => 
    day.isActive && day.members.includes(memberId)
  );
  
  let totalCost = 0;
  
  participatingDays.forEach(day => {
    if (day.members.length > 0) {
      // Default is 260,000 VND per session divided by number of participants
      const costPerPerson = (day.sessionCost || 260000) / day.members.length;
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
      members: [...day.members, memberId]
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
export const formatDate = (date: string): string => {
  const dateObj = new Date(date);
  const day = dateObj.getDate();
  const month = dateObj.getMonth() + 1;
  return `${day < 10 ? '0' + day : day}/${month < 10 ? '0' + month : month}`;
};
