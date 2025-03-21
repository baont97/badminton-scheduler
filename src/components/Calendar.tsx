
import React, { useState } from "react";
import { CalendarDay, Member, getDayName, formatDate } from "@/utils/schedulerUtils";
import { toast } from "sonner";

interface CalendarProps {
  days: CalendarDay[];
  members: Member[];
  onUpdateDays: (days: CalendarDay[]) => void;
}

const Calendar: React.FC<CalendarProps> = ({ days, members, onUpdateDays }) => {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const handleToggleMember = (dayIndex: number, memberId: number) => {
    const day = days[dayIndex];
    const updatedDays = [...days];
    
    // Check if member is already in the day
    const isMemberInDay = day.members.includes(memberId);
    
    if (isMemberInDay) {
      // If member is core, they cannot be removed
      const member = members.find(m => m.id === memberId);
      if (member?.isCore) {
        toast.error("Không thể xóa thành viên cứng khỏi lịch");
        return;
      }
      
      // Remove member from day
      updatedDays[dayIndex] = {
        ...day,
        members: day.members.filter(id => id !== memberId)
      };
    } else {
      // Add member to day if not at max capacity
      if (day.members.length >= day.maxMembers) {
        toast.error(`Đã đạt giới hạn ${day.maxMembers} người cho ngày này`);
        return;
      }
      
      updatedDays[dayIndex] = {
        ...day,
        members: [...day.members, memberId]
      };
    }
    
    onUpdateDays(updatedDays);
  };

  // Auto-add core members to all days
  React.useEffect(() => {
    const coreMembers = members.filter(member => member.isCore).map(member => member.id);
    
    let needsUpdate = false;
    const updatedDays = days.map(day => {
      const missingCoreMembers = coreMembers.filter(id => !day.members.includes(id));
      
      if (missingCoreMembers.length > 0) {
        needsUpdate = true;
        return {
          ...day,
          members: [...day.members, ...missingCoreMembers]
        };
      }
      
      return day;
    });
    
    if (needsUpdate) {
      onUpdateDays(updatedDays);
    }
  }, [members]);

  return (
    <div className="glass-card p-6 animate-fade-in">
      <h2 className="text-lg font-medium mb-4 text-center">Lịch Đánh Cầu Tháng 4/2024</h2>
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {days.map((day, dayIndex) => (
          <div 
            key={dayIndex}
            className={`calendar-day p-4 ${day.isActive ? 'calendar-day-active' : 'bg-gray-100'}`}
            onMouseEnter={() => setHoveredDay(dayIndex)}
            onMouseLeave={() => setHoveredDay(null)}
          >
            <div className="flex justify-between items-center mb-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-badminton text-white">
                {getDayName(day.dayOfWeek)}
              </span>
              <span className="text-sm font-semibold">{formatDate(day.date)}</span>
            </div>
            
            <div className="mb-2">
              <p className="text-xs text-muted-foreground">
                {day.members.length}/{day.maxMembers} người tham gia
              </p>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                <div 
                  className="bg-badminton h-1.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${(day.members.length / day.maxMembers) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-2">
              {members.map(member => {
                const isInDay = day.members.includes(member.id);
                return (
                  <div 
                    key={member.id}
                    className={`flex items-center justify-between p-2 rounded-lg transition-all duration-200 
                      ${isInDay ? 'bg-badminton bg-opacity-10' : 'hover:bg-gray-100'}`}
                    onClick={() => handleToggleMember(dayIndex, member.id)}
                  >
                    <div className="flex items-center">
                      <div className={`w-4 h-4 rounded-sm border flex items-center justify-center mr-2 checkbox-animation
                        ${isInDay ? 'bg-badminton border-badminton' : 'border-gray-300'}`}
                      >
                        {isInDay && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-sm ${member.isCore ? 'font-medium' : ''}`}>
                        {member.name}
                      </span>
                    </div>
                    {member.isCore && (
                      <span className="text-xs bg-badminton text-white px-1.5 py-0.5 rounded">
                        Cứng
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Calendar;
