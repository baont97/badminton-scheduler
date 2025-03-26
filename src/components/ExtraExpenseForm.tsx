import { useState } from "react";
import { CalendarDay, formatCurrency } from "@/utils/schedulerUtils";
import {
  addExtraExpense,
  deleteExtraExpense,
  ExtraExpense,
} from "@/utils/apiUtils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PlusCircle, Coins, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ExtraExpenseFormProps {
  day: CalendarDay;
  onUpdateDay: (day: CalendarDay) => void;
}

const ExtraExpenseForm = ({ day, onUpdateDay }: ExtraExpenseFormProps) => {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const { user, profile } = useAuth();
  const isAdmin = profile?.is_admin === true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error("Vui lòng nhập số tiền hợp lệ");
      return;
    }

    setLoading(true);
    try {
      const success = await addExtraExpense(
        day.id,
        Number(amount),
        description
      );

      if (success) {
        toast.success("Thêm chi phí phát sinh thành công");

        // Add the new expense to the day's expenses
        const newExpense: ExtraExpense = {
          id: crypto.randomUUID(), // Temporary ID until refresh
          dayId: day.id,
          userId: user?.id || "",
          userName: user?.user_metadata?.user_name || "You",
          amount: Number(amount),
          description,
          createdAt: new Date().toISOString(),
        };

        const updatedDay = {
          ...day,
          extraExpenses: [...(day.extraExpenses || []), newExpense],
        };

        onUpdateDay(updatedDay);
        setAmount("");
        setDescription("");
        setShowForm(false);
      } else {
        toast.error("Không thể thêm chi phí phát sinh");
      }
    } catch (error) {
      console.error("Error adding expense:", error);
      toast.error("Có lỗi xảy ra khi thêm chi phí phát sinh");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!user) {
      toast.error("Bạn cần đăng nhập để xóa chi phí phát sinh");
      return;
    }

    setLoading(true);
    try {
      const success = await deleteExtraExpense(expenseId);

      if (success) {
        toast.success("Đã xóa chi phí phát sinh");

        const updatedDay = {
          ...day,
          extraExpenses: (day.extraExpenses || []).filter(
            (expense) => expense.id !== expenseId
          ),
        };

        onUpdateDay(updatedDay);
      } else {
        toast.error("Không thể xóa chi phí phát sinh");
      }
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error("Có lỗi xảy ra khi xóa chi phí phát sinh");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center">
          <Coins className="h-3.5 w-3.5 mr-1.5 text-badminton" />
          Chi phí phát sinh:
        </h3>
        {!showForm && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-badminton text-badminton hover:bg-badminton/10"
            onClick={() => setShowForm(true)}
          >
            <PlusCircle className="h-3.5 w-3.5 mr-1" />
            Thêm
          </Button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-2 p-3 border-l-2 border-badminton rounded-md bg-badminton/5 shadow-sm"
        >
          <div>
            <Input
              type="number"
              placeholder="Số tiền (VND)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-sm"
              autoFocus
            />
          </div>
          <div>
            <Textarea
              placeholder="Mô tả chi phí"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-sm min-h-[60px]"
            />
          </div>
          <div className="flex justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-1/2"
              type="button"
              onClick={() => setShowForm(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              className="w-1/2 bg-badminton hover:bg-badminton/90"
              disabled={loading}
            >
              <Coins className="h-4 w-4 mr-1" />
              Thêm
            </Button>
          </div>
        </form>
      )}

      {day.extraExpenses && day.extraExpenses.length > 0 ? (
        <div className="rounded-md border overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[40%]">Người thêm</TableHead>
                <TableHead className="w-[35%] text-right">Số tiền</TableHead>
                <TableHead className="w-[25%] text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {day.extraExpenses.map((expense) => (
                <TableRow key={expense.id} className="hover:bg-badminton/5">
                  <TableCell className="font-medium">
                    {expense.userName}
                    {expense.description && (
                      <p className="text-xs text-muted-foreground">
                        {expense.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-badminton">
                    {formatCurrency(expense.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 ml-2 text-destructive"
                      onClick={() => handleDeleteExpense(expense.id)}
                      disabled={loading || user?.id !== expense.userId}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Xóa</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground italic p-3 bg-muted/20 rounded-md border border-dashed">
          Chưa có chi phí phát sinh
        </div>
      )}
    </div>
  );
};

export default ExtraExpenseForm;
