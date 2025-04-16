// src/pages/PaymentResult.tsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { checkPaymentStatus } from "@/utils/momoPayment";

const PaymentResult = () => {
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const orderId = params.get("orderId");
    const resultCode = params.get("resultCode");

    const verifyPayment = async () => {
      try {
        if (!orderId) {
          setSuccess(false);
          setMessage("Không tìm thấy thông tin thanh toán");
          setLoading(false);
          return;
        }

        // MoMo returns resultCode=0 for successful payments
        if (resultCode === "0") {
          // Verify with our backend to be sure
          const statusResult = await checkPaymentStatus(orderId);

          if (statusResult.completed) {
            setSuccess(true);
            setMessage("Thanh toán thành công");
          } else {
            setSuccess(false);
            setMessage(
              `Thanh toán chưa hoàn tất. Trạng thái: ${statusResult.status}`
            );
          }
        } else {
          setSuccess(false);
          setMessage("Thanh toán thất bại hoặc đã bị hủy.");
        }
      } catch (error) {
        console.error("Error verifying payment:", error);
        setSuccess(false);
        setMessage("Lỗi xác thực thanh toán");
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [location]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Kết quả thanh toán</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center text-center">
          {loading ? (
            <div className="py-8 flex flex-col items-center">
              <Loader2 className="h-12 w-12 text-badminton animate-spin mb-4" />
              <p>Đang kiểm tra trạng thái thanh toán...</p>
            </div>
          ) : success ? (
            <div className="py-6 flex flex-col items-center">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-xl font-medium mb-2">
                Thanh toán thành công
              </h3>
              <p className="text-gray-600">{message}</p>
            </div>
          ) : (
            <div className="py-6 flex flex-col items-center">
              <XCircle className="h-16 w-16 text-red-500 mb-4" />
              <h3 className="text-xl font-medium mb-2">Thanh toán thất bại</h3>
              <p className="text-gray-600">{message}</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button
            className="bg-badminton hover:bg-badminton/90"
            onClick={() => navigate("/")}
          >
            Quay lại trang chủ
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PaymentResult;
