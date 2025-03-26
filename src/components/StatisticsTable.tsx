
import React from "react";
import {
  CalendarDay,
  Member,
  calculateCostPerPerson,
  formatCurrency,
  getTotalExtraExpenses,
  getMemberExpensesCredit
} from "@/utils/schedulerUtils";
import { Badge } from "@/components/ui/badge";
import ClickableAvatar from "@/components/ClickableAvatar";
import { Coins } from "lucide-react";

interface StatisticsTableProps {
  days: CalendarDay[];
  members: Member[];
}

const StatisticsTable: React.FC<StatisticsTableProps> = ({ days, members }) => {
  // Calculate the total extra expenses for all days
  const totalExtraExpenses = days.reduce(
    (total, day) => total + getTotalExtraExpenses(day), 
    0
  );

  // Calculate total expenses contributed per member
  const calculateMemberExpensesContribution = (memberId: string): number => {
    return days.reduce(
      (total, day) => total + getMemberExpensesCredit(day, memberId),
      0
    );
  };

  return (
    <div className="glass-card p-6 animate-slide-up">
      <h2 className="text-lg font-medium mb-6 text-center">Thống kê chi phí</h2>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left pb-3 font-medium">Thành viên</th>
              <th className="text-center pb-3 font-medium">Trạng thái</th>
              <th className="text-center pb-3 font-medium">Số buổi tham gia</th>
              <th className="text-center pb-3 font-medium">Chi phí phát sinh</th>
              <th className="text-right pb-3 font-medium">Tổng chi phí</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const { totalDays, totalCost } = calculateCostPerPerson(
                days,
                member.id
              );
              const expensesContribution = calculateMemberExpensesContribution(member.id);
              
              return (
                <tr
                  key={member.id}
                  className="border-b border-border/60 hover:bg-muted/20 transition-colors"
                >
                  <td className="py-4">
                    <div className="flex items-center">
                      <ClickableAvatar
                        name={member.name}
                        imageUrl={member.avatarUrl}
                        size="md"
                        className="mr-3"
                      />
                      <span>{member.name}</span>
                    </div>
                  </td>
                  <td className="py-4 text-center">
                    {member.isCore ? (
                      <Badge className="bg-badminton text-white border-none">
                        CỨNG
                      </Badge>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Thành viên
                      </span>
                    )}
                  </td>
                  <td className="py-4 text-center">
                    <span className="font-medium">{totalDays}</span> buổi
                  </td>
                  <td className="py-4 text-center">
                    {expensesContribution > 0 ? (
                      <div className="flex items-center justify-center">
                        <Coins className="h-3.5 w-3.5 mr-1 text-amber-500" />
                        <span className="font-medium text-amber-600">
                          {formatCurrency(expensesContribution)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="py-4 text-right">
                    <span className={`font-medium ${totalCost < 0 ? 'text-green-600' : ''}`}>
                      {formatCurrency(totalCost)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 p-4 bg-badminton-light rounded-lg border border-badminton/20">
        <p className="text-sm text-center text-badminton-dark">
          Chi phí mỗi buổi:{" "}
          <span className="font-bold">{formatCurrency(260000)}</span> chia đều
          cho số người tham gia
        </p>
        {totalExtraExpenses > 0 && (
          <p className="text-sm text-center mt-1 text-badminton-dark">
            Tổng chi phí phát sinh: <span className="font-bold">{formatCurrency(totalExtraExpenses)}</span>
          </p>
        )}
      </div>
      
      <div className="mt-4 text-xs text-muted-foreground">
        <p className="text-center">
          Người nhập chi phí phát sinh sẽ được trừ vào phần chi phí phải trả.
          Nếu chi phí hiện số âm, người đó sẽ được nhận lại số tiền dư.
        </p>
      </div>
    </div>
  );
};

export default StatisticsTable;
