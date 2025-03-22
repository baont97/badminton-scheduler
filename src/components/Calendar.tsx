
import React, { useState, useEffect } from "react";
import { CalendarDay, Member, getDayName, formatDate } from "@/utils/schedulerUtils";
import { toast } from "sonner";
import { fetchDayParticipants, toggleParticipation } from "@/utils/apiUtils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Check, X, Star, Calendar as CalendarIcon, Upload } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CalendarProps {
  days: CalendarDay[];
  members: Member[];
  onUpdateDays: (days: CalendarDay[]) => void;
}

const Calendar: React.FC<CalendarProps> = ({ days, members, onUpdateDays }) => {
  const [loading, setLoading] = useState(false);
  const { user, profile } = useAuth();
  const isAdmin = profile?.is_admin === true;
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Filter days to current month only unless admin
  const filteredDays = days.filter(day => {
    const dayDate = new Date(day.date);
    if (!isAdmin) {
      // For non-admins, only show current month and future dates
      const today = new Date();
      return dayDate.getMonth() === currentMonth && 
             dayDate.getFullYear() === currentYear &&
             dayDate >= new Date(today.setHours(0, 0, 0, 0));
    }
    // Admins can see all days
    return true;
  });

  const isPastDay = (date: string): boolean => {
    return new Date(date) < new Date();
  };

  const isUserParticipating = (day: CalendarDay): boolean => {
    return user ? day.members.includes(user.id) : false;
  };

  const isUserCore = (): boolean => {
    return members.some(member => member.id === user?.id && member.isCore);
  };

  const handleToggleParticipation = async (dayIndex: number) => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để tham gia");
      return;
    }
    
    const day = filteredDays[dayIndex];
    
    // Check if the day is in the past
    if (isPastDay(day.date) && !isAdmin) {
      toast.error("Không thể thay đổi tham gia cho ngày đã qua");
      return;
    }
    
    const isMemberInDay = day.members.includes(user.id);
    
    // Check core member status
    const member = members.find(m => m.id === user.id);
    if (isMemberInDay && member?.isCore) {
      toast.error("Thành viên cứng không thể hủy tham gia, chỉ có thể nhường slot");
      return;
    }
    
    // Check max members limit
    if (!isMemberInDay && day.members.length >= day.maxMembers) {
      toast.error(`Đã đạt giới hạn ${day.maxMembers} người cho ngày này`);
      return;
    }
    
    setLoading(true);
    
    // Toggle participation in database
    const success = await toggleParticipation(day.id, user.id, isMemberInDay);
    
    if (success) {
      const updatedDays = [...days];
      const actualDayIndex = days.findIndex(d => d.id === day.id);
      
      if (isMemberInDay) {
        // Remove member from day
        updatedDays[actualDayIndex] = {
          ...days[actualDayIndex],
          members: days[actualDayIndex].members.filter(id => id !== user.id)
        };
      } else {
        // Add member to day
        updatedDays[actualDayIndex] = {
          ...days[actualDayIndex],
          members: [...days[actualDayIndex].members, user.id]
        };
      }
      
      onUpdateDays(updatedDays);
    } else {
      toast.error("Có lỗi xảy ra khi cập nhật trạng thái tham gia");
    }
    
    setLoading(false);
  };

  // Mock function to handle payment uploads - would be connected to real API
  const handlePaymentUpload = (dayId: string) => {
    // This would be replaced with actual file upload logic
    toast.success("Đã ghi nhận thanh toán, chờ xác nhận từ admin");
  };

  // Mock function to handle core member giving up their slot
  const handleGiveUpSlot = (dayId: string) => {
    toast.info("Đã ghi nhận yêu cầu nhường slot, vui lòng chờ xác nhận");
  };

  // Auto-add core members to all days
  useEffect(() => {
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
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-center">Lịch Đánh Cầu Tháng {currentMonth + 1}/{currentYear}</h2>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              const newDate = new Date(currentYear, currentMonth - 1);
              setCurrentMonth(newDate.getMonth());
              setCurrentYear(newDate.getFullYear());
            }}
            disabled={!isAdmin && (currentMonth <= new Date().getMonth() && currentYear <= new Date().getFullYear())}
          >
            Tháng trước
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              const newDate = new Date(currentYear, currentMonth + 1);
              setCurrentMonth(newDate.getMonth());
              setCurrentYear(newDate.getFullYear());
            }}
          >
            Tháng sau
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredDays.map((day, dayIndex) => {
          const isParticipating = isUserParticipating(day);
          const isPast = isPastDay(day.date);
          const userCore = isUserCore();
          
          return (
            <div 
              key={dayIndex}
              className={`calendar-day p-4 ${day.isActive ? 'calendar-day-active' : 'bg-gray-100'} 
                ${isPast ? 'opacity-70' : ''}`}
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
                <h3 className="text-sm font-medium">Người tham gia:</h3>
                {day.members.length > 0 ? (
                  day.members.map(memberId => {
                    const memberData = members.find(m => m.id === memberId);
                    if (!memberData) return null;
                    
                    return (
                      <div 
                        key={memberId}
                        className="flex items-center justify-between p-2 rounded-lg bg-badminton bg-opacity-10"
                      >
                        <div className="flex items-center">
                          <div className="w-6 h-6 rounded-full bg-badminton flex items-center justify-center text-white text-xs mr-2">
                            {memberData.name.charAt(0)}
                          </div>
                          <span className="text-sm">
                            {memberData.name}
                          </span>
                        </div>
                        {memberData.isCore && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="p-1">
                                <Star className="h-3 w-3 text-badminton" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Thành viên cứng</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground italic">Chưa có người tham gia</p>
                )}
              </div>

              {user && (
                <div className="mt-4 space-y-2">
                  {isParticipating ? (
                    <div className="flex flex-col gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full border-red-500 text-red-500 hover:bg-red-50"
                        onClick={() => handleToggleParticipation(dayIndex)}
                        disabled={loading || (isPast && !isAdmin) || (userCore && !isAdmin)}
                      >
                        <X className="h-4 w-4 mr-1" /> Hủy tham gia
                      </Button>
                      
                      {userCore && !isPast && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full"
                          onClick={() => handleGiveUpSlot(day.id)}
                        >
                          <Star className="h-4 w-4 mr-1" /> Nhường slot
                        </Button>
                      )}
                      
                      {!userCore && !isPast && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full border-green-500 text-green-500 hover:bg-green-50"
                          onClick={() => handlePaymentUpload(day.id)}
                        >
                          <Upload className="h-4 w-4 mr-1" /> Tải lên thanh toán
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button 
                      className="w-full bg-badminton hover:bg-badminton/80"
                      size="sm"
                      onClick={() => handleToggleParticipation(dayIndex)}
                      disabled={loading || (isPast && !isAdmin) || day.members.length >= day.maxMembers}
                    >
                      <CalendarIcon className="h-4 w-4 mr-1" /> Tham gia
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;
