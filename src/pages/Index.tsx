
import React, { useState, useEffect } from "react";
import Calendar from "@/components/Calendar";
import MemberList from "@/components/MemberList";
import StatisticsTable from "@/components/StatisticsTable";
import { 
  CalendarDay, 
  Member, 
  getAprilTuesdaysAndFridays, 
  generateMembers 
} from "@/utils/schedulerUtils";
import { Toaster } from "sonner";

const Index = () => {
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize data
    const aprilDays = getAprilTuesdaysAndFridays();
    const initialMembers = generateMembers();
    
    setDays(aprilDays);
    setMembers(initialMembers);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 animate-pulse">
          <p className="text-xl font-light text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Toaster position="top-center" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-12 text-center">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-badminton-light text-badminton mb-2 animate-fade-in">
            Tháng 4/2024
          </div>
          <h1 className="text-4xl font-bold mb-2 animate-slide-down">Lịch Đánh Cầu Lông</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto animate-fade-in">
            Lịch trình tập luyện cầu lông các ngày Thứ Ba và Thứ Sáu trong tháng 4 năm 2024.
          </p>
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2">
            <Calendar 
              days={days} 
              members={members} 
              onUpdateDays={setDays} 
            />
          </div>
          <div>
            <MemberList 
              members={members} 
              onUpdateMembers={setMembers} 
            />
          </div>
        </div>
        
        <div className="mb-12">
          <StatisticsTable 
            days={days} 
            members={members} 
          />
        </div>
      </div>
      
      <footer className="py-8 text-center text-sm text-muted-foreground border-t">
        <p>© 2024 Lịch Đánh Cầu Lông</p>
      </footer>
    </div>
  );
};

export default Index;
