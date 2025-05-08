
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

        // Check if user should be marked as paid
        const userSlotCount = day.slots.find(
          slot => slot[0] === user?.id
        )?.[1] || 1;
        
        const totalSlots = day.slots.reduce((sum, slot) => sum + slot[1], 0);
        const costPerSlot = 
          (day.sessionCost + 
            (updatedDay.extraExpenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0)
          ) / totalSlots;
        
        const userTotalCost = costPerSlot * userSlotCount;
        
        const userExpenses = updatedDay.extraExpenses
          ?.filter(exp => exp.userId === user?.id)
          .reduce((sum, exp) => sum + exp.amount, 0) || 0;
        
        if (userExpenses >= userTotalCost && user?.id && !day.paidMembers.includes(user.id)) {
          // If user expenses are enough to cover their share, mark them as paid
          updatedDay.paidMembers = [...updatedDay.paidMembers, user.id];
          toast.success("Chi phí của bạn đã đủ để đánh dấu là đã thanh toán");
        }

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

  const handleDeleteExpense = async (expenseId: string, expenseUserId: string) => {
    if (!user) {
      toast.error("Bạn cần đăng nhập để xóa chi phí phát sinh");
      return;
    }

    setLoading(true);
    try {
      const success = await deleteExtraExpense(expenseId);

      if (success) {
        toast.success("Đã xóa chi phí phát sinh");

        // Remove the expense from the day's expenses
        const updatedExpenses = (day.extraExpenses || []).filter(
          expense => expense.id !== expenseId
        );

        const updatedDay = {
          ...day,
          extraExpenses: updatedExpenses,
        };

        // Check if user's payment status should be updated
        if (expenseUserId === user.id && day.paidMembers.includes(user.id)) {
          // Recalculate if the user should still be marked as paid
          const userSlotCount = day.slots.find(
            slot => slot[0] === user.id
          )?.[1] || 1;
          
          const totalSlots = day.slots.reduce((sum, slot) => sum + slot[1], 0);
          const costPerSlot = 
            (day.sessionCost + 
              (updatedExpenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0)
            ) / totalSlots;
          
          const userTotalCost = costPerSlot * userSlotCount;
          
          const userExpenses = updatedExpenses
            ?.filter(exp => exp.userId === user.id)
            .reduce((sum, exp) => sum + exp.amount, 0) || 0;
          
          if (userExpenses < userTotalCost) {
            // User no longer has enough expenses to cover their share
            updatedDay.paidMembers = updatedDay.paidMembers.filter(id => id !== user.id);
            toast.info("Trạng thái thanh toán đã được cập nhật lại");
          }
        }

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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs border-badminton text-badminton hover:bg-badminton/10"
                  onClick={() => setShowForm(true)}
                >
                  <PlusCircle className="h-3.5 w-3.5 mr-1" />
                  Thêm
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Thêm chi phí phát sinh</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 ml-2 text-destructive"
                            onClick={() => handleDeleteExpense(expense.id, expense.userId)}
                            disabled={loading || (user?.id !== expense.userId && !isAdmin)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Xóa</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Xóa chi phí</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
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
