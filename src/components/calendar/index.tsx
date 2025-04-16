// src/components/Calendar/index.tsx
import React, { useState } from "react";
import { CalendarDay, Member } from "@/utils/schedulerUtils";
import { CalendarHeader } from "./CalendarHeader";
import { CalendarEmptyState } from "./CalendarEmptyState";
import { CalendarGrid } from "./CalendarGrid";
import { BillModal } from "../BillModal";

interface CalendarProps {
  days: CalendarDay[];
  members: Member[];
  onUpdateDays: (days: CalendarDay[]) => void;
  currentMonth: number;
  currentYear: number;
  onChangeMonth: (month: number, year: number) => void;
  refreshData: () => void;
}

const Calendar: React.FC<CalendarProps> = ({
  days,
  members,
  onUpdateDays,
  currentMonth,
  currentYear,
  onChangeMonth,
  refreshData,
}) => {
  const [loading, setLoading] = useState(false);
  const [hidePaidDays, setHidePaidDays] = useState(true);
  const [selectedDayForBill, setSelectedDayForBill] =
    useState<CalendarDay | null>(null);
  const [billModalOpen, setBillModalOpen] = useState(false);

  const handleOpenBill = (day: CalendarDay) => {
    setSelectedDayForBill(day);
    setBillModalOpen(true);
  };

  const handleUpdateDay = (updatedDay: CalendarDay) => {
    const updatedDays = days.map((day) =>
      day.id === updatedDay.id ? updatedDay : day
    );
    onUpdateDays(updatedDays);
  };

  return (
    <div className="glass-card p-2 sm:p-6 animate-fade-in">
      <CalendarHeader
        currentMonth={currentMonth}
        currentYear={currentYear}
        onPreviousMonth={() => {
          let newMonth = currentMonth - 1;
          let newYear = currentYear;
          if (newMonth < 1) {
            newMonth = 12;
            newYear -= 1;
          }
          onChangeMonth(newMonth, newYear);
        }}
        onNextMonth={() => {
          let newMonth = currentMonth + 1;
          let newYear = currentYear;
          if (newMonth > 12) {
            newMonth = 1;
            newYear += 1;
          }
          onChangeMonth(newMonth, newYear);
        }}
        hidePaidDays={hidePaidDays}
        setHidePaidDays={setHidePaidDays}
        refreshData={refreshData}
      />

      {days.length === 0 ? (
        <CalendarEmptyState onGenerateDays={() => {}} loading={loading} />
      ) : (
        <CalendarGrid
          days={days}
          members={members}
          onUpdateDays={onUpdateDays}
          hidePaidDays={hidePaidDays}
          loading={loading}
          setLoading={setLoading}
          onOpenBill={handleOpenBill}
          onUpdateDay={handleUpdateDay}
        />
      )}

      {selectedDayForBill && (
        <BillModal
          isOpen={billModalOpen}
          onClose={() => setBillModalOpen(false)}
          day={selectedDayForBill}
          members={members}
        />
      )}
    </div>
  );
};

export default Calendar;
