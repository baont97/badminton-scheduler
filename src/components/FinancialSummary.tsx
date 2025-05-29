
import React from "react";
import {
  CalendarDay,
  Member,
  getTotalMoneySpent,
  getTotalMoneyCollected,
  getMoneyBalance,
  formatCurrency,
} from "@/utils/schedulerUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Wallet } from "lucide-react";

interface FinancialSummaryProps {
  days: CalendarDay[];
  members: Member[];
}

const FinancialSummary: React.FC<FinancialSummaryProps> = ({
  days,
  members,
}) => {
  const totalSpent = getTotalMoneySpent(days);
  const totalCollected = getTotalMoneyCollected(days, members);
  const balance = getMoneyBalance(days, members);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Tổng quan tài chính
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Collected */}
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
            <div>
              <p className="text-sm text-green-600 font-medium">Đã thu</p>
              <p className="text-lg font-bold text-green-700">
                {formatCurrency(totalCollected)}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>

          {/* Total Spent */}
          <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
            <div>
              <p className="text-sm text-red-600 font-medium">Đã chi</p>
              <p className="text-lg font-bold text-red-700">
                {formatCurrency(totalSpent)}
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-500" />
          </div>

          {/* Balance */}
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div>
              <p className="text-sm text-blue-600 font-medium">Số dư</p>
              <p className={`text-lg font-bold ${balance >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                {formatCurrency(balance)}
              </p>
            </div>
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-blue-500" />
              {balance >= 0 ? (
                <Badge className="ml-2 bg-green-500">Dương</Badge>
              ) : (
                <Badge className="ml-2 bg-red-500">Âm</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 text-xs text-muted-foreground">
          <p className="text-center">
            * Thành viên cứng được miễn phí sân. Thành viên vãng lai tính thêm 20% (tối thiểu 50k).
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinancialSummary;
