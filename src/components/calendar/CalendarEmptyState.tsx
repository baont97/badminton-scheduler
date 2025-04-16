// src/components/Calendar/CalendarEmptyState.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import { CalendarIcon, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { generateBadmintonDays } from "@/utils/apiUtils";
import { toast } from "sonner";

interface CalendarEmptyStateProps {
  onGenerateDays?: () => void;
  loading: boolean;
}

export const CalendarEmptyState: React.FC<CalendarEmptyStateProps> = ({
  onGenerateDays,
  loading,
}) => {
  const { profile } = useAuth();
  const isAdmin = profile?.is_admin === true;

  const handleGenerateDays = async () => {
    if (!isAdmin) {
      toast.error("Bạn không có quyền tạo buổi tập");
      return;
    }

    if (!onGenerateDays) {
      const currentDate = new Date();
      try {
        await generateBadmintonDays(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1
        );
        toast.success("Đã tạo buổi tập thành công");
      } catch (error) {
        console.error("Error generating days:", error);
        toast.error("Có lỗi xảy ra khi tạo buổi tập");
      }
    } else {
      onGenerateDays();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-8 sm:py-12">
      <CalendarIcon className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-4" />
      <p className="text-gray-500 text-center mb-4 text-sm sm:text-base">
        Chưa có buổi tập nào trong tháng này
      </p>
      {isAdmin && (
        <Button
          onClick={handleGenerateDays}
          disabled={loading}
          className="bg-badminton hover:bg-badminton/90 text-sm"
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CalendarIcon className="h-4 w-4 mr-2" />
          )}
          Tạo buổi tập
        </Button>
      )}
    </div>
  );
};
