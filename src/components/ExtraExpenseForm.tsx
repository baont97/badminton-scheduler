
import { useState } from "react";
import { CalendarDay, formatCurrency } from "@/utils/schedulerUtils";
import { addExtraExpense, deleteExtraExpense, ExtraExpense } from "@/utils/apiUtils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PlusCircle, X, Coins } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface ExtraExpenseFormProps {
  day: CalendarDay;
  onUpdateDay: (day: CalendarDay) => void;
}

const ExtraExpenseForm = ({ day, onUpdateDay }: ExtraExpenseFormProps) => {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const { user } = useAuth();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error("Vui lòng nhập số tiền hợp lệ");
      return;
    }
    
    setLoading(true);
    const success = await addExtraExpense(day.id, Number(amount), description);
    
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
        createdAt: new Date().toISOString()
      };
      
      const updatedDay = {
        ...day,
        extraExpenses: [...(day.extraExpenses || []), newExpense]
      };
      
      onUpdateDay(updatedDay);
      setAmount("");
      setDescription("");
      setShowForm(false);
    } else {
      toast.error("Không thể thêm chi phí phát sinh");
    }
    
    setLoading(false);
  };
  
  const handleDeleteExpense = async (expenseId: string) => {
    setLoading(true);
    const success = await deleteExtraExpense(expenseId);
    
    if (success) {
      toast.success("Đã xóa chi phí phát sinh");
      
      const updatedDay = {
        ...day,
        extraExpenses: (day.extraExpenses || []).filter(expense => expense.id !== expenseId)
      };
      
      onUpdateDay(updatedDay);
    } else {
      toast.error("Không thể xóa chi phí phát sinh");
    }
    
    setLoading(false);
  };
  
  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Chi phí phát sinh:</h3>
        {!showForm && (
          <Button 
            variant="ghost" 
            size="sm"
            className="text-xs"
            onClick={() => setShowForm(true)}
          >
            <PlusCircle className="h-3.5 w-3.5 mr-1" />
            Thêm
          </Button>
        )}
      </div>
      
      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-2 p-3 border border-dashed rounded-md bg-muted/30">
          <div>
            <Input
              type="number"
              placeholder="Số tiền (VND)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-sm"
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
              className="w-1/2"
              disabled={loading}
            >
              <Coins className="h-4 w-4 mr-1" />
              Thêm
            </Button>
          </div>
        </form>
      )}
      
      {day.extraExpenses && day.extraExpenses.length > 0 ? (
        <div className="space-y-2 max-h-60 overflow-y-auto p-1">
          {day.extraExpenses.map((expense) => (
            <div 
              key={expense.id} 
              className="flex justify-between items-center p-2 rounded-md bg-muted/20 text-sm"
            >
              <div className="flex-1">
                <div className="flex justify-between">
                  <span className="font-medium">{expense.userName}</span>
                  <span className="text-badminton font-semibold">
                    {formatCurrency(expense.amount)}
                  </span>
                </div>
                {expense.description && (
                  <p className="text-xs text-muted-foreground">{expense.description}</p>
                )}
              </div>
              {user?.id === expense.userId && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 ml-2 text-destructive"
                  onClick={() => handleDeleteExpense(expense.id)}
                  disabled={loading}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">Chưa có chi phí phát sinh</p>
      )}
    </div>
  );
};

export default ExtraExpenseForm;
