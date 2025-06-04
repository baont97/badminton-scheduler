import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/schedulerUtils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayId: string;
  dayDate: string;
  amount: number;
  onPaymentRequested: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  dayId,
  dayDate,
  amount,
  onPaymentRequested,
}) => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleCopyAmount = () => {
    navigator.clipboard.writeText(amount.toString());
    toast.success("Đã copy số tiền");
  };

  const handlePaymentConfirm = async () => {
    if (!user) {
      toast.error("Vui lòng đăng nhập");
      return;
    }

    // Validate dữ liệu
    if (!dayId || !amount || amount <= 0) {
      toast.error("Dữ liệu không hợp lệ");
      return;
    }

    setLoading(true);
    try {
      const roundedAmount = Math.round(amount);
      const formattedDate = new Date(dayDate).toLocaleDateString("vi-VN");

      const { error } = await supabase.from("payment_requests").insert({
        day_id: dayId,
        user_id: user.id,
        amount: roundedAmount,
        notes: `Thanh toán cho buổi ${formattedDate}`,
      });

      if (error) throw error;

      toast.success("Đã gửi yêu cầu thanh toán! Chờ admin duyệt.");
      onPaymentRequested();
      onClose();
    } catch (error: any) {
      console.error("Error creating payment request:", error);
      toast.error(error.message || "Có lỗi xảy ra khi tạo yêu cầu thanh toán");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Thanh toán</DialogTitle>
          <DialogDescription>
            Thanh toán cho buổi chơi ngày {dayDate}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6 py-4">
          {/* QR Code placeholder - sẽ được thay thế bằng QR thực tế */}
          <div className="w-48 h-48 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-sm font-medium">QR Code MoMo</div>
              <div className="text-xs mt-1">Sẽ được cập nhật sau</div>
            </div>
          </div>

          {/* Amount with copy function */}
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Số tiền cần thanh toán:
            </label>
            <div className="flex items-center space-x-2">
              <div className="flex-1 p-3 bg-gray-50 rounded-lg border">
                <span className="font-bold text-lg text-green-600">
                  {formatCurrency(amount)}
                </span>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyAmount}
                title="Copy số tiền"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="w-full text-sm text-gray-600 space-y-2">
            <p>
              📱 <strong>Hướng dẫn thanh toán:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Mở app MoMo và quét QR code</li>
              <li>Kiểm tra số tiền chính xác</li>
              <li>Thực hiện thanh toán</li>
              <li>Nhấn "Đã thanh toán" bên dưới</li>
            </ol>
          </div>

          {/* Action buttons */}
          <div className="flex space-x-3 w-full">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Hủy
            </Button>
            <Button
              onClick={handlePaymentConfirm}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Đã thanh toán
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
