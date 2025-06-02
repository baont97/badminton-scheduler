// src/components/Calendar/CalendarHeader.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={refreshData}
                className="hover:rotate-180 transition-transform duration-300"
                aria-label="Refresh calendar data"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Tải lại dữ liệu</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={onPreviousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Tháng trước</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={onNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Tháng sau</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
};
