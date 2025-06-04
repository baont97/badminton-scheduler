import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Clock, RefreshCw, Filter } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/utils/schedulerUtils";
import {
  fetchPaymentRequestsByStatus,
  approvePaymentRequest,
  rejectPaymentRequest,
  PaymentRequest,
} from "@/utils/api/paymentRequestApi";

type PaymentStatus = "pending" | "approved" | "rejected" | "all";

const PaymentRequestManagement: React.FC = () => {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] =
    useState<PaymentStatus>("pending");
  const [rejectDialog, setRejectDialog] = useState<{
    isOpen: boolean;
    requestId: string;
    notes: string;
  }>({
    isOpen: false,
    requestId: "",
    notes: "",
  });

  const loadRequests = async (status: PaymentStatus = selectedStatus) => {
    setLoading(true);
    try {
      console.log("Loading requests with status:", status);
      const data = await fetchPaymentRequestsByStatus(status);
      console.log("Loaded requests:", data);
      setRequests(data);
    } catch (error) {
      console.error("Error loading payment requests:", error);
      toast.error("Có lỗi khi tải danh sách yêu cầu thanh toán");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests(selectedStatus);
  }, [selectedStatus]);

  const handleStatusChange = (status: PaymentStatus) => {
    setSelectedStatus(status);
  };

  const handleApprove = async (request: PaymentRequest) => {
    setProcessingId(request.id);
    try {
      const success = await approvePaymentRequest(
        request.id,
        request.day_id,
        request.user_id
      );

      if (success) {
        toast.success("Đã duyệt thanh toán thành công");
        loadRequests(); // Reload the list
      } else {
        toast.error("Có lỗi khi duyệt thanh toán");
      }
    } catch (error) {
      console.error("Error approving payment:", error);
      toast.error("Có lỗi xảy ra");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    setProcessingId(rejectDialog.requestId);
    try {
      const success = await rejectPaymentRequest(
        rejectDialog.requestId,
        rejectDialog.notes
      );

      if (success) {
        toast.success("Đã từ chối yêu cầu thanh toán");
        setRejectDialog({ isOpen: false, requestId: "", notes: "" });
        loadRequests(); // Reload the list
      } else {
        toast.error("Có lỗi khi từ chối yêu cầu");
      }
    } catch (error) {
      console.error("Error rejecting payment:", error);
      toast.error("Có lỗi xảy ra");
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectDialog = (requestId: string) => {
    setRejectDialog({
      isOpen: true,
      requestId,
      notes: "",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="text-yellow-600 border-yellow-600"
          >
            <Clock className="h-3 w-3 mr-1" />
            Chờ duyệt
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="text-green-600 border-green-600">
            <Check className="h-3 w-3 mr-1" />
            Đã duyệt
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="text-red-600 border-red-600">
            <X className="h-3 w-3 mr-1" />
            Đã từ chối
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusLabel = (status: PaymentStatus) => {
    switch (status) {
      case "pending":
        return "Chờ duyệt";
      case "approved":
        return "Đã duyệt";
      case "rejected":
        return "Đã từ chối";
      case "all":
        return "Tất cả";
      default:
        return status;
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Quản lý yêu cầu thanh toán
          </CardTitle>
          <div className="flex items-center gap-3">
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Trạng thái:</span>
              <Select value={selectedStatus} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Chờ duyệt</SelectItem>
                  <SelectItem value="approved">Đã duyệt</SelectItem>
                  <SelectItem value="rejected">Đã từ chối</SelectItem>
                  <SelectItem value="all">Tất cả</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadRequests()}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Status Summary */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                Hiển thị: {getStatusLabel(selectedStatus)}
              </span>
              <span className="text-gray-600">
                Tổng cộng: {requests.length} yêu cầu
              </span>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Đang tải...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>
                Không có yêu cầu thanh toán nào cho trạng thái:{" "}
                {getStatusLabel(selectedStatus)}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thành viên</TableHead>
                  <TableHead>Buổi chơi</TableHead>
                  <TableHead>Số tiền</TableHead>
                  <TableHead>Thời gian tạo</TableHead>
                  {selectedStatus !== "pending" && (
                    <TableHead>Thời gian xử lý</TableHead>
                  )}
                  <TableHead>Trạng thái</TableHead>
                  {selectedStatus === "rejected" && (
                    <TableHead>Lý do</TableHead>
                  )}
                  {selectedStatus === "pending" && (
                    <TableHead>Thao tác</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      {request.profiles?.user_name || "Không có tên"}
                    </TableCell>
                    <TableCell>
                      {request.badminton_days ? (
                        <div>
                          <div className="font-medium">
                            {formatDate(request.badminton_days.date)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {request.badminton_days.session_time}
                          </div>
                        </div>
                      ) : (
                        "Không có thông tin"
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-green-600">
                        {formatCurrency(request.amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-500">
                        {new Date(request.created_at).toLocaleString("vi-VN")}
                      </div>
                    </TableCell>
                    {selectedStatus !== "pending" && (
                      <TableCell>
                        <div className="text-sm text-gray-500">
                          {request.processed_at
                            ? new Date(request.processed_at).toLocaleString(
                                "vi-VN"
                              )
                            : "-"}
                        </div>
                      </TableCell>
                    )}
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    {selectedStatus === "rejected" && (
                      <TableCell>
                        <div
                          className="text-sm text-gray-600 max-w-xs truncate"
                          title={request.notes || ""}
                        >
                          {request.notes || "Không có lý do"}
                        </div>
                      </TableCell>
                    )}
                    {selectedStatus === "pending" && (
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(request)}
                            disabled={processingId === request.id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {processingId === request.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openRejectDialog(request.id)}
                            disabled={processingId === request.id}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog
        open={rejectDialog.isOpen}
        onOpenChange={(open) =>
          !open && setRejectDialog({ isOpen: false, requestId: "", notes: "" })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối yêu cầu thanh toán</DialogTitle>
            <DialogDescription>
              Vui lòng nhập lý do từ chối (tùy chọn)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Lý do từ chối..."
              value={rejectDialog.notes}
              onChange={(e) =>
                setRejectDialog((prev) => ({ ...prev, notes: e.target.value }))
              }
            />
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() =>
                  setRejectDialog({ isOpen: false, requestId: "", notes: "" })
                }
              >
                Hủy
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={processingId === rejectDialog.requestId}
              >
                {processingId === rejectDialog.requestId ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Từ chối
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PaymentRequestManagement;
