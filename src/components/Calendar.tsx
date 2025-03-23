
import React, { useState, useEffect } from "react";
import { CalendarDay, Member, getDayName, formatDate } from "@/utils/schedulerUtils";
import { toast } from "sonner";
import { fetchDayParticipants, toggleParticipation, markPaymentStatus } from "@/utils/apiUtils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Check, X, Star, Calendar as CalendarIcon, CreditCard } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface CalendarProps {
  days: CalendarDay[];
  members: Member[];
  onUpdateDays: (days: CalendarDay[]) => void;
  currentMonth: number;
  currentYear: number;
  onChangeMonth: (month: number, year: number) => void;
}

const Calendar: React.FC<CalendarProps> = ({ 
  days, 
  members, 
  onUpdateDays, 
  currentMonth, 
  currentYear, 
  onChangeMonth 
}) => {
  const [loading, setLoading] = useState(false);
  const { user, profile } = useAuth();
  const isAdmin = profile?.is_admin === true;

  // Filter days to current month only unless admin
  const filteredDays = days.filter(day => {
    const dayDate = new Date(day.date);
    if (!isAdmin) {
      // For non-admins, only show current month and future dates
      const today = new Date();
      return dayDate >= new Date(today.setHours(0, 0, 0, 0));
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

  const hasUserPaid = (day: CalendarDay): boolean => {
    return user ? day.paidMembers.includes(user.id) : false;
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
    
    // Check if the day is in the past or not active
    if ((isPastDay(day.date) || !day.isActive) && !isAdmin) {
      toast.error("Không thể thay đổi tham gia cho ngày này");
      return;
    }
    
    const isMemberInDay = day.members.includes(user.id);
    
    // Check core member status
    const member = members.find(m => m.id === user.id);
    if (isMemberInDay && member?.isCore) {
      toast.error("Thành viên cứng không thể hủy tham gia");
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
          members: days[actualDayIndex].members.filter(id => id !== user.id),
          paidMembers: days[actualDayIndex].paidMembers.filter(id => id !== user.id)
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

  // Handle payment status
  const handleTogglePaymentStatus = async (dayId: string) => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để thanh toán");
      return;
    }
    
    const dayIndex = days.findIndex(d => d.id === dayId);
    if (dayIndex === -1) return;
    
    const day = days[dayIndex];
    const hasAlreadyPaid = day.paidMembers.includes(user.id);
    
    setLoading(true);
    
    const success = await markPaymentStatus(dayId, user.id, !hasAlreadyPaid);
    
    if (success) {
      const updatedDays = [...days];
      
      if (hasAlreadyPaid) {
        // Remove from paid members
        updatedDays[dayIndex] = {
          ...days[dayIndex],
          paidMembers: days[dayIndex].paidMembers.filter(id => id !== user.id)
        };
        toast.success("Đã hủy trạng thái thanh toán");
      } else {
        // Add to paid members
        updatedDays[dayIndex] = {
          ...days[dayIndex],
          paidMembers: [...days[dayIndex].paidMembers, user.id]
        };
        toast.success("Đã xác nhận thanh toán");
      }
      
      onUpdateDays(updatedDays);
    } else {
      toast.error("Có lỗi xảy ra khi cập nhật trạng thái thanh toán");
    }
    
    setLoading(false);
  };

  // Handle month navigation
  const handlePreviousMonth = () => {
    let newMonth = currentMonth - 1;
    let newYear = currentYear;
    
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    
    onChangeMonth(newMonth, newYear);
  };

  const handleNextMonth = () => {
    let newMonth = currentMonth + 1;
    let newYear = currentYear;
    
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    
    onChangeMonth(newMonth, newYear);
  };

  // Auto-add core members to all days
  useEffect(() => {
    const coreMembers = members.filter(member => member.isCore).map(member => member.id);
    
    if (coreMembers.length === 0) return;
    
    let needsUpdate = false;
    const updatedDays = days.map(day => {
      const missingCoreMembers = coreMembers.filter(id => !day.members.includes(id));
      
      if (missingCoreMembers.length > 0) {
        needsUpdate = true;
        
        // Add missing core members to this day
        const updatedDay = {
          ...day,
          members: [...day.members, ...missingCoreMembers]
        };
        
        // Automatically update the database for each core member
        missingCoreMembers.forEach(memberId => {
          // We need to call the API to add them to the database, but don't wait for it
          toggleParticipation(day.id, memberId, false)
            .catch(error => console.error(`Error auto-adding core member ${memberId} to day ${day.id}:`, error));
        });
        
        return updatedDay;
      }
      
      return day;
    });
    
    if (needsUpdate) {
      console.log("Auto-adding core members to days");
      onUpdateDays(updatedDays);
    }
  }, [days, members]);

  // Get Vietnamese month name
  const getMonthName = (month: number) => {
    return `Tháng ${month}`;
  };

  return (
    <div className="glass-card p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-center">Lịch Đánh Cầu {getMonthName(currentMonth)}/{currentYear}</h2>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePreviousMonth}
            disabled={!isAdmin && (
              new Date().getMonth() + 1 === currentMonth && 
              new Date().getFullYear() === currentYear
            )}
          >
            Tháng trước
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleNextMonth}
          >
            Tháng sau
          </Button>
        </div>
      </div>
      
      {filteredDays.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg">
          <p>Không có lịch đánh cầu nào trong tháng này</p>
          {isAdmin && (
            <p className="mt-2 text-sm">
              Bạn có thể thiết lập lịch đánh cầu trong phần Cài đặt ở trang Admin
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredDays.map((day, dayIndex) => {
            const isParticipating = isUserParticipating(day);
            const hasPaid = hasUserPaid(day);
            const isPast = isPastDay(day.date);
            const userCore = isUserCore();
            const isDisabled = !day.isActive || (isPast && !isAdmin);
            
            return (
              <div 
                key={dayIndex}
                className={`calendar-day p-4 ${day.isActive ? 'calendar-day-active' : 'bg-gray-200'} 
                  ${isDisabled ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <div className="flex justify-between items-center mb-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${day.isActive ? 'bg-badminton text-white' : 'bg-gray-400 text-white'}`}>
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
                      className={`h-1.5 rounded-full transition-all duration-300 ease-out ${day.isActive ? 'bg-badminton' : 'bg-gray-400'}`}
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
                      const memberHasPaid = day.paidMembers.includes(memberId);
                      
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
                          <div className="flex items-center space-x-1">
                            {memberHasPaid && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-500">
                                      <Check className="h-3 w-3 mr-1" />Đã TT
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Đã thanh toán</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {memberData.isCore && (
                              <TooltipProvider>
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
                              </TooltipProvider>
                            )}
                          </div>
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
                          className={`w-full ${hasPaid ? 'border-green-500 text-green-500 hover:bg-green-50' : 'border-badminton text-badminton hover:bg-badminton/10'}`}
                          onClick={() => handleTogglePaymentStatus(day.id)}
                          disabled={loading || (isPast && !isAdmin)}
                        >
                          {hasPaid ? (
                            <>
                              <Check className="h-4 w-4 mr-1" /> Đã thanh toán
                            </>
                          ) : (
                            <>
                              <CreditCard className="h-4 w-4 mr-1" /> Xác nhận thanh toán
                            </>
                          )}
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full border-red-500 text-red-500 hover:bg-red-50"
                          onClick={() => handleToggleParticipation(dayIndex)}
                          disabled={loading || isDisabled || (userCore && !isAdmin)}
                        >
                          <X className="h-4 w-4 mr-1" /> Hủy tham gia
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        className={`w-full ${day.isActive ? 'bg-badminton hover:bg-badminton/80' : 'bg-gray-400 hover:bg-gray-500'}`}
                        size="sm"
                        onClick={() => handleToggleParticipation(dayIndex)}
                        disabled={loading || isDisabled || day.members.length >= day.maxMembers}
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
      )}
    </div>
  );
};

export default Calendar;
