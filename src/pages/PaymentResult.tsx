import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { checkMomoPaymentStatus } from "@/utils/momoApiUtils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

const PaymentResult = () => {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<
    "success" | "failure" | "processing" | null
  >(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkPayment = async () => {
      try {
        // Lấy orderId từ query params
        const urlParams = new URLSearchParams(location.search);
        const orderId = urlParams.get("orderId");

        if (!orderId) {
          toast.error("Không tìm thấy thông tin thanh toán");
          setStatus("failure");
          setLoading(false);
          return;
        }

        // Kiểm tra trạng thái thanh toán
        const result = await checkMomoPaymentStatus(orderId);

        if (result.participantHasPaid) {
          setStatus("success");
          toast.success("Thanh toán thành công!");
        } else if (result.status === "Failed") {
          setStatus("failure");
          toast.error("Thanh toán thất bại");
        } else {
          setStatus("processing");
          toast.info("Thanh toán đang được xử lý");
        }
      } catch (error) {
        console.error("Error checking payment status:", error);
        toast.error("Có lỗi xảy ra khi kiểm tra thanh toán");
        setStatus("failure");
      } finally {
        setLoading(false);
      }
    };

    checkPayment();
  }, [location.search]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg text-center">
        <h1 className="text-2xl font-bold mb-6">Kết quả thanh toán</h1>

        {loading ? (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-16 w-16 text-badminton animate-spin" />
            <p className="text-gray-600">
              Đang kiểm tra trạng thái thanh toán...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-6">
            {status === "success" && (
              <>
                <CheckCircle className="h-20 w-20 text-green-500" />
                <h2 className="text-xl font-medium text-green-700">
                  Thanh toán thành công!
                </h2>
              </>
            )}

            {status === "failure" && (
              <>
                <XCircle className="h-20 w-20 text-red-500" />
                <h2 className="text-xl font-medium text-red-700">
                  Thanh toán thất bại
                </h2>
              </>
            )}

            {status === "processing" && (
              <>
                <Loader2 className="h-20 w-20 text-yellow-500 animate-spin" />
                <h2 className="text-xl font-medium text-yellow-700">
                  Thanh toán đang xử lý
                </h2>
                <p className="text-gray-600">
                  Chúng tôi đang xác nhận thanh toán của bạn. Vui lòng quay lại
                  sau.
                </p>
              </>
            )}

            <div className="mt-6">
              <Button
                className="bg-badminton hover:bg-badminton/80"
                onClick={() => navigate("/")}
              >
                Quay lại trang chủ
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentResult;
