
import React, { useState, useEffect } from "react";
import Calendar from "@/components/Calendar";
import MemberList from "@/components/MemberList";
import StatisticsTable from "@/components/StatisticsTable";
import { Member, CalendarDay, getAprilTuesdaysAndFridays } from "@/utils/schedulerUtils";
import { fetchUsers, fetchBadmintonDays } from "@/utils/apiUtils";
import { toast } from "sonner";

const Index = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1); // 1-indexed month
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Fetch users and day participants on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch users
        const users = await fetchUsers();
        setMembers(users);
        
        // Fetch days for the current month based on admin settings
        const calendarDays = await fetchBadmintonDays(currentYear, currentMonth);
        
        // If no days were returned, use the fallback method
        if (calendarDays.length === 0) {
          setDays(getAprilTuesdaysAndFridays());
          toast.warning("Không thể tải lịch từ cơ sở dữ liệu, đang sử dụng lịch mặc định");
        } else {
          setDays(calendarDays);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Có lỗi xảy ra khi tải dữ liệu");
        // Use fallback schedule as last resort
        setDays(getAprilTuesdaysAndFridays());
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [currentMonth, currentYear]);

  // Update month/year and reload data
  const changeMonth = (month: number, year: number) => {
    setCurrentMonth(month);
    setCurrentYear(year);
  };

  if (loading) {
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
