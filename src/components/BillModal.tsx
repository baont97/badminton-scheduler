import React, { useRef } from "react";
import {
  CalendarDay,
  Member,
  formatCurrency,
  formatDate,
  getDayName,
  getParticipantCount,
  getTotalExtraExpenses,
  getTotalParticipantsInDay,
  calculatePaymentAmount,
} from "@/utils/schedulerUtils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Share2 } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface BillModalProps {
  isOpen: boolean;
  onClose: () => void;
  day: CalendarDay;
  members: Member[];
}

export const BillModal: React.FC<BillModalProps> = ({
  isOpen,
  onClose,
  day,
  members,
}) => {
  const billRef = useRef<HTMLDivElement>(null);

  const getFormattedDateTime = () => {
    const date = new Date();
    return date.toLocaleString("vi-VN");
  };

  // Extract session start time from the sessionTime string (e.g., "19:00-21:00")
  const getStartTime = () => {
    if (!day.sessionTime) return "";
    return day.sessionTime.split("-")[0].trim();
  };

  const handleSaveBill = async () => {
    if (!billRef.current) return;

    try {
      const canvas = await html2canvas(billRef.current, {
        scale: 2,
        logging: false,
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(
        `Hóa-đơn-cầu-lông-${formatDate(day.date).replace(/\//g, "-")}.pdf`
      );
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  const handleShareBill = async () => {
    if (!billRef.current) return;

    try {
      const canvas = await html2canvas(billRef.current, {
        scale: 2,
        logging: false,
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const blob = await (await fetch(imgData)).blob();

      if (navigator.share) {
        // Web Share API is supported
        const file = new File(
          [blob],
          `Hóa-đơn-cầu-lông-${formatDate(day.date).replace(/\//g, "-")}.png`,
          { type: "image/png" }
        );

        await navigator.share({
          title: `Hóa đơn cầu lông - ${formatDate(day.date)}`,
          text: `Hóa đơn cầu lông ngày ${formatDate(day.date)}`,
          files: [file],
        });
      } else {
        // Fallback: copy image to clipboard
        const data = [new ClipboardItem({ "image/png": blob })];
        await navigator.clipboard.write(data);
        alert("Hình ảnh hóa đơn đã được copy vào clipboard!");
      }
    } catch (error) {
      console.error("Error sharing bill:", error);
      // Fallback method: open in new tab
      if (!billRef.current) return;
      const canvas = await html2canvas(billRef.current);
      const imgData = canvas.toDataURL("image/png");
      const newTab = window.open();
      if (newTab) {
        newTab.document.write(
          `<img src="${imgData}" alt="Bill" style="max-width: 100%;">`
        );
      }
    }
  };

  const totalParticipants = getTotalParticipantsInDay(day);
  const totalSessionCost = day.sessionCost || 0;
  const costPerPerson =
    totalParticipants > 0 ? totalSessionCost / totalParticipants : 0;
  const totalExtraExpenses = getTotalExtraExpenses(day);
  const extraExpensesPerPerson =
    totalParticipants > 0 ? totalExtraExpenses / totalParticipants : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogTitle className="text-center text-xl">
          Hóa Đơn Cầu Lông {formatDate(day.date)}
        </DialogTitle>
        <DialogDescription className="text-center text-sm">
          Thời gian xuất hóa đơn: {getFormattedDateTime()}
        </DialogDescription>

        {/* Bill Content */}
        <div ref={billRef} className="p-4 border rounded-lg bg-white">
          <div className="text-center mb-4">
            <h1 className="text-xl font-bold">CLB Cầu Lông 320 Trường Chinh</h1>
            <p className="text-sm text-gray-500">
              Địa chỉ: 320 Trường Chinh, Hà Nội
            </p>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold">HÓA ĐƠN THANH TOÁN</h2>
            <p className="font-medium">
              {getDayName(day.dayOfWeek)}, ngày {formatDate(day.date)}
            </p>
            <p className="text-sm">Giờ đánh: {day.sessionTime}</p>
          </div>

          <div className="mb-4">
            <h3 className="font-medium border-b pb-1 mb-2">
              Thông tin chi phí:
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Tổng người tham gia:</div>
              <div className="text-right font-medium">
                {totalParticipants} người
              </div>

              <div>Sân:</div>
              <div className="text-right font-medium">
                {formatCurrency(totalSessionCost)}
              </div>

              <div>1 người:</div>
              <div className="text-right font-medium">
                {formatCurrency(costPerPerson)}
              </div>

              {totalExtraExpenses > 0 && (
                <>
                  <div>Phát sinh:</div>
                  <div className="text-right font-medium">
                    {formatCurrency(totalExtraExpenses)}
                  </div>

                  <div>Phát sinh / người:</div>
                  <div className="text-right font-medium">
                    {formatCurrency(extraExpensesPerPerson)}
                  </div>
                </>
              )}
            </div>
          </div>

          {day.extraExpenses && day.extraExpenses.length > 0 && (
            <div className="mb-4">
              <h3 className="font-medium border-b pb-1 mb-2">
                Chi tiết phát sinh:
              </h3>
              <div className="text-sm space-y-1">
                {day.extraExpenses.map((expense, index) => (
                  <div key={expense.id} className="grid grid-cols-3 gap-2">
                    <div>{expense.userName}:</div>
                    <div className="text-center">
                      {expense.description || "Chi phí phát sinh"}
                    </div>
                    <div className="text-right font-medium">
                      {formatCurrency(expense.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-4">
            <h3 className="font-medium border-b pb-1 mb-2">
              Danh sách người tham gia:
            </h3>
            <div className="text-sm space-y-2">
              {day.members.map((memberId) => {
                const memberData = members.find((m) => m.id === memberId);
                if (!memberData) return null;

                const participantCount = getParticipantCount(day, memberId);
                const paymentAmount = calculatePaymentAmount(day, memberId);
                const hasPaid =
                  day.paidMembers.includes(memberId) || memberData.isCore;

                return (
                  <div
                    key={memberId}
                    className="grid grid-cols-3 gap-2 p-1 border-b border-gray-100"
                  >
                    <div className="font-medium">{memberData.name}</div>
                    <div>
                      {participantCount > 1
                        ? `${participantCount} người`
                        : "1 người"}
                      {memberData.isCore && (
                        <span className="text-xs ml-1 text-badminton">
                          (Thành viên cứng)
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span
                        className={`${
                          paymentAmount < 0 ? "text-green-600" : ""
                        } font-medium`}
                      >
                        {formatCurrency(paymentAmount)}
                      </span>
                      <span
                        className={`text-xs ml-1 ${
                          hasPaid ? "text-green-600" : "text-red-500"
                        }`}
                      >
                        ({hasPaid ? "Đã TT" : "Chưa TT"})
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-8 text-center text-xs text-gray-500">
            <p>Cảm ơn quý thành viên đã tham gia cùng CLB!</p>
            <p>Hóa đơn được xuất tự động bởi hệ thống.</p>
          </div>
        </div>

        <div className="flex gap-4 justify-center mt-4">
          <Button
            onClick={handleSaveBill}
            className="bg-badminton hover:bg-badminton/80"
          >
            <Printer className="h-4 w-4 mr-2" />
            Lưu hóa đơn PDF
          </Button>
          <Button onClick={handleShareBill} variant="outline">
            <Share2 className="h-4 w-4 mr-2" />
            Chia sẻ hóa đơn
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
