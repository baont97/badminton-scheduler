// src/components/Calendar/CalendarHeader.tsx
import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RefreshCw } from "lucide-react";

interface CalendarHeaderProps {
  currentMonth: number;
  currentYear: number;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  hidePaidDays: boolean;
  setHidePaidDays: (hide: boolean) => void;
  refreshData: () => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentMonth,
  currentYear,
  onPreviousMonth,
  onNextMonth,
  hidePaidDays,
  setHidePaidDays,
  refreshData,
}) => {
  const getMonthName = (month: number) => {
    return `Tháng ${month}`;
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
      <h2 className="text-lg font-medium text-center flex gap-2 w-full sm:w-auto justify-center sm:justify-start">
        Lịch Đánh Cầu {getMonthName(currentMonth)}/{currentYear}
        <button
          onClick={refreshData}
          className="hover:rotate-180 transition-transform duration-300"
          aria-label="Refresh calendar data"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </h2>
      <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
        <div className="flex items-center space-x-2 w-full sm:w-auto justify-center">
          <Switch
            id="hide-paid-days"
            checked={hidePaidDays}
            onCheckedChange={setHidePaidDays}
          />
          <Label htmlFor="hide-paid-days" className="text-sm">
            Ẩn ngày đã thanh toán
          </Label>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={onPreviousMonth}
            disabled={
              new Date().getMonth() + 1 === currentMonth &&
              new Date().getFullYear() === currentYear
            }
            className="flex-1 sm:flex-none text-sm"
          >
            Tháng trước
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onNextMonth}
            className="flex-1 sm:flex-none text-sm"
          >
            Tháng sau
          </Button>
        </div>
      </div>
    </div>
  );
};
