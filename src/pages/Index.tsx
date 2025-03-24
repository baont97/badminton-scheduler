import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Calendar from "@/components/Calendar";
import MemberList from "@/components/MemberList";
import StatisticsTable from "@/components/StatisticsTable";
import { Member, CalendarDay } from "@/utils/schedulerUtils";
import { fetchUsers, fetchBadmintonDays } from "@/utils/apiUtils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1); // 1-indexed month
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Use React Query for data fetching with improved error handling
  const {
    data: userData,
    isLoading: usersLoading,
    error: usersError,
  } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    retry: 3,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: calendarData,
    isLoading: calendarLoading,
    error: calendarError,
  } = useQuery({
    queryKey: ["badminton-days", currentYear, currentMonth],
    queryFn: () => fetchBadmintonDays(currentYear, currentMonth),
    retry: 3,
    staleTime: 5 * 60 * 1000,
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

  // Handle errors
  useEffect(() => {
    if (usersError) {
      console.error("Error fetching users:", usersError);
      toast.error("Không thể tải danh sách thành viên");
    }

    if (calendarError) {
      console.error("Error fetching calendar data:", calendarError);
      toast.error("Không thể tải lịch hoạt động");
    }
  }, [usersError, calendarError]);

  // Update month/year and reload data
  const changeMonth = (month: number, year: number) => {
    setCurrentMonth(month);
    setCurrentYear(year);
  };

  const isLoading = usersLoading || calendarLoading;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="glass-card p-6 space-y-4">
              <Skeleton className="h-8 w-1/3 mb-4" />
              <div className="grid grid-cols-7 gap-2">
                {Array(7)
                  .fill(0)
                  .map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-md" />
                  ))}
              </div>
            </div>
          </div>
          <div>
            <div className="glass-card p-6 space-y-4">
              <Skeleton className="h-8 w-1/2 mb-4" />
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-md" />
                ))}
            </div>
          </div>
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
