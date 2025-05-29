
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Calendar from "@/components/calendar";
import MemberList from "@/components/MemberList";
import StatisticsTable from "@/components/StatisticsTable";
import FinancialSummary from "@/components/FinancialSummary";
import { Member, CalendarDay } from "@/utils/schedulerUtils";
import { fetchUsers, fetchBadmintonDays } from "@/utils/api";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "react-router-dom";

const Index = () => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const [members, setMembers] = useState<Member[]>([]);
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1); // 1-indexed month
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Check for payment return URL parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const resultCode = params.get("resultCode");

    // If we've returned from payment and have a successful result,
    // invalidate the badminton days cache to force a refresh
    if (resultCode === "0") {
      queryClient.invalidateQueries({
        queryKey: ["badminton-days"],
      });
    }
  }, [location.search, queryClient]);

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
    refetch: refreshCalendarData,
  } = useQuery({
    queryKey: ["badminton-days", currentYear, currentMonth],
    queryFn: () => fetchBadmintonDays(currentYear, currentMonth),
    retry: 3,
    staleTime: 5 * 60 * 1000,
  });

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

  const changeMonth = (month: number, year: number) => {
    setCurrentMonth(month);
    setCurrentYear(year);
  };

  // Create a wrapper function that matches the expected type
  const refreshCalendarDataWrapper = async (): Promise<void> => {
    try {
      // Show loading toast
      const loadingToast = toast.loading("Đang tải lại dữ liệu...");

      // Use await to properly handle the promise
      const result = await refreshCalendarData();

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      if (result.data && result.data.length > 0) {
        setDays(result.data);
        toast.success("Đã tải lại lịch hoạt động thành công");
      } else if (result.data && result.data.length === 0) {
        // No data returned, might need to generate
        toast.info("Không có buổi tập nào trong tháng này");
      } else if (result.error) {
        throw result.error;
      }
    } catch (error) {
      console.error("Error refreshing calendar data:", error);
      toast.error(
        "Không thể tải lại lịch hoạt động: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
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
      {/* Financial Summary */}
      <div className="mb-8">
        <FinancialSummary days={days} members={members} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Calendar
            days={days}
            members={members}
            onUpdateDays={setDays}
            currentMonth={currentMonth}
            currentYear={currentYear}
            onChangeMonth={changeMonth}
            refreshData={refreshCalendarDataWrapper}
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
