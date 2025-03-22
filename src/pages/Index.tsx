
import React, { useState, useEffect } from "react";
import Calendar from "@/components/Calendar";
import MemberList from "@/components/MemberList";
import StatisticsTable from "@/components/StatisticsTable";
import { Member, CalendarDay, getAprilTuesdaysAndFridays } from "@/utils/schedulerUtils";
import { fetchUsers, fetchDayParticipants } from "@/utils/apiUtils";
import { toast } from "sonner";

const Index = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [days, setDays] = useState<CalendarDay[]>(getAprilTuesdaysAndFridays());
  const [loading, setLoading] = useState(true);

  // Fetch users and day participants on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch users
        const users = await fetchUsers();
        setMembers(users);
        
        // Fetch participants for each day
        const updatedDays = await Promise.all(
          days.map(async (day) => {
            const participants = await fetchDayParticipants(day.id);
            return {
              ...day,
              members: participants
            };
          })
        );
        
        setDays(updatedDays);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Có lỗi xảy ra khi tải dữ liệu");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

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
          <Calendar days={days} members={members} onUpdateDays={setDays} />
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
