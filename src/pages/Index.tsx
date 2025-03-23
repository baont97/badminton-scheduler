
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Calendar from "@/components/Calendar";
import MemberList from "@/components/MemberList";
import StatisticsTable from "@/components/StatisticsTable";
import { Member, CalendarDay, getAprilTuesdaysAndFridays } from "@/utils/schedulerUtils";
import { fetchUsers, fetchBadmintonDays } from "@/utils/apiUtils";
import { toast } from "sonner";

const Index = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1); // 1-indexed month
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Use React Query for data fetching
  const { data: userData, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  const { data: calendarData, isLoading: calendarLoading } = useQuery({
    queryKey: ['badminton-days', currentYear, currentMonth],
    queryFn: () => fetchBadmintonDays(currentYear, currentMonth),
  });

  // Update state when data is fetched
  useEffect(() => {
    if (userData) {
      setMembers(userData);
    }
  }, [userData]);

  useEffect(() => {
    if (calendarData) {
      setDays(calendarData);
    }
  }, [calendarData]);

  // Update month/year and reload data
  const changeMonth = (month: number, year: number) => {
    setCurrentMonth(month);
    setCurrentYear(year);
  };

  const isLoading = usersLoading || calendarLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 animate-pulse">
          <p className="text-xl font-light text-muted-foreground">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Calendar 
            days={days} 
            members={members} 
            onUpdateDays={setDays}
            currentMonth={currentMonth}
            currentYear={currentYear}
            onChangeMonth={changeMonth}
          />
        </div>
        <div>
          <MemberList members={members} onUpdateMembers={setMembers} />
        </div>
      </div>
      
      <div className="mt-8">
        <StatisticsTable days={days} members={members} />
      </div>
    </div>
  );
};

export default Index;
