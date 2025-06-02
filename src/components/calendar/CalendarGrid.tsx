// src/components/calendar/CalendarGrid.tsx
import React from "react";
import { CalendarDay, Member } from "@/utils/schedulerUtils";
import { CalendarDayComponent } from "./CalendarDay";
import { isAllMembersPaid } from "./utils";

interface CalendarGridProps {
  days: CalendarDay[];
  members: Member[];
  onUpdateDays: (days: CalendarDay[]) => void;
  hidePaidDays: boolean;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  onOpenBill: (day: CalendarDay) => void;
  onUpdateDay: (day: CalendarDay) => void;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  days,
  members,
  onUpdateDays,
  hidePaidDays,
  loading,
  setLoading,
  onOpenBill,
  onUpdateDay,
}) => {
  // ⭐ SẮP XẾP THEO NGÀY TRƯỚC KHI FILTER
  const sortedDays = [...days].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  // Filter days based on hidePaidDays
  const filteredDays = sortedDays.filter((day) => {
    const allPaid = isAllMembersPaid(day, members);
    return !hidePaidDays || !allPaid;
  });

  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-6 md:grid-cols-2">
      {filteredDays.map((day, dayIndex) => (
        <CalendarDayComponent
          key={day.id}
          day={day}
          dayIndex={dayIndex}
          members={members}
          onUpdateDay={onUpdateDay}
          onOpenBill={onOpenBill}
          setLoading={setLoading}
          loading={loading}
        />
      ))}
    </div>
  );
};
