
// Fixed version of src/components/Calendar/CalendarEmptyState.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import { CalendarIcon, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { generateBadmintonDays } from "@/utils/api/dayApi";
import { toast } from "sonner";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

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

  // Local loading state to prevent double clicks
  const [isGenerating, setIsGenerating] = React.useState(false);

  const handleGenerateDays = async () => {
    if (!isAdmin) {
      toast.error("Bạn không có quyền tạo buổi tập");
      return;
    }

    // Prevent multiple clicks
    if (isGenerating) return;

    setIsGenerating(true);

    try {
      // Fallback to direct API call if no callback provided
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      // Show loading toast
      toast.loading("Đang tạo buổi tập...", { id: "creating-days" });

      console.log("Calling generateBadmintonDays directly");
      // Call the function directly with proper error handling
      const result = await generateBadmintonDays(year, month);

      toast.dismiss("creating-days");
      if (result && result.length > 0) {
        toast.success(`Đã tạo ${result.length} buổi tập thành công`);
      } else {
        toast.warning("Không có buổi tập nào được tạo");
      }

      if (onGenerateDays) {
        // Call the provided callback
        onGenerateDays();
      }
    } catch (error) {
      toast.dismiss("creating-days");
      console.error("Error generating days:", error);

      // Display detailed error message
      if (error instanceof Error) {
        toast.error(`Lỗi: ${error.message}`);
      } else {
        toast.error("Có lỗi xảy ra khi tạo buổi tập");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Combine the loading states from props and local state
  const isButtonDisabled = loading || isGenerating;

  return (
    <div className="flex flex-col items-center justify-center py-8 sm:py-12">
      <CalendarIcon className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-4" />
      <p className="text-gray-500 text-center mb-4 text-sm sm:text-base">
        Chưa có buổi tập nào trong tháng này
      </p>
      {isAdmin && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleGenerateDays}
                disabled={isButtonDisabled}
                className="bg-badminton hover:bg-badminton/90"
                size="sm"
              >
                {isButtonDisabled ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CalendarIcon className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Tạo buổi tập</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};
