import React from "react";
import {
  CalendarDay,
  Member,
  calculateCostPerPerson,
  formatCurrency,
  getTotalExtraExpenses,
  getMemberExpensesCredit,
} from "@/utils/schedulerUtils";
import { Badge } from "@/components/ui/badge";
import ClickableAvatar from "@/components/ClickableAvatar";
import { Coins } from "lucide-react";

interface StatisticsTableProps {
  days: CalendarDay[];
  members: Member[];
}

const StatisticsTable: React.FC<StatisticsTableProps> = ({ days, members }) => {
  // ⭐ SẮP XẾP DAYS THEO NGÀY TRƯỚC KHI TÍNH TOÁN
  const sortedDays = [...days].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  // Calculate the total extra expenses for all days
  const totalExtraExpenses = sortedDays.reduce(
    (total, day) => total + getTotalExtraExpenses(day),
    0
  );

  // Calculate total expenses contributed per member
  const calculateMemberExpensesContribution = (memberId: string): number => {
    return sortedDays.reduce(
      (total, day) => total + getMemberExpensesCredit(day, memberId),
      0
    );
  };

  return (
    <div className="glass-card p-3 sm:p-6 animate-slide-up">
      <h2 className="text-lg font-medium mb-4 sm:mb-6 text-center">
        Thống kê chi phí
      </h2>

      {/* Mobile view */}
      <div className="block sm:hidden space-y-4">
        {members.map((member) => {
          const { totalDays, totalCost } = calculateCostPerPerson(
            sortedDays, // ⭐ SỬ DỤNG SORTED DAYS
            member.id,
            members
          );
          const expensesContribution = calculateMemberExpensesContribution(
            member.id
          );

          return (
            <div
              key={member.id}
              className="border rounded-lg p-3 space-y-3 hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ClickableAvatar
                    name={member.name}
                    imageUrl={member.avatarUrl}
                    size="md"
                    className="mr-2"
                  />
                  <div>
                    <span className="font-medium">{member.name}</span>
                    <div className="mt-1">
                      {member.isCore ? (
                        <Badge className="bg-badminton text-white border-none text-xs">
                          CỨNG
                        </Badge>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Thành viên
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">
                    Tổng chi phí
                  </div>
                  <span
                    className={`font-medium ${
                      totalCost < 0 ? "text-green-600" : ""
                    }`}
                  >
                    {formatCurrency(member.isCore ? 0 : totalCost)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-muted-foreground">Số buổi tham gia</div>
                  <div className="font-medium">{totalDays} buổi</div>
                </div>
                <div className="text-right">
                  <div className="text-muted-foreground">Chi phí phát sinh</div>
                  {expensesContribution > 0 ? (
                    <div className="flex items-center justify-end">
                      <Coins className="h-3.5 w-3.5 mr-1 text-amber-500" />
                      <span className="font-medium text-amber-600">
                        {formatCurrency(expensesContribution)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop view */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left pb-3 font-medium">Thành viên</th>
              <th className="text-center pb-3 font-medium">Trạng thái</th>
              <th className="text-center pb-3 font-medium">Số buổi tham gia</th>
              <th className="text-center pb-3 font-medium">
                Chi phí phát sinh
              </th>
              <th className="text-right pb-3 font-medium">Tổng chi phí</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const { totalDays, totalCost } = calculateCostPerPerson(
                sortedDays, // ⭐ SỬ DỤNG SORTED DAYS
                member.id,
                members
              );
              const expensesContribution = calculateMemberExpensesContribution(
                member.id
              );

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
                    <div className="flex flex-col items-center gap-1">
                      {member.isCore ? (
                        <Badge className="bg-badminton text-white border-none">
                          CỨNG
                        </Badge>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Thành viên
                        </span>
                      )}
                    </div>
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
                    <span
                      className={`font-medium ${
                        totalCost < 0 ? "text-green-600" : ""
                      }`}
                    >
                      {formatCurrency(member.isCore ? 0 : totalCost)}
                    </span>
                    {member.isCore && (
                      <div className="text-xs text-muted-foreground">
                        Thành viên cứng được miễn phí
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-badminton-light rounded-lg border border-badminton/20">
        <p className="text-sm text-center text-badminton-dark">
          Chi phí mỗi buổi:{" "}
          <span className="font-bold">{formatCurrency(260000)}</span> chia đều
          cho số người tham gia
        </p>
        {totalExtraExpenses > 0 && (
          <p className="text-sm text-center mt-1 text-badminton-dark">
            Tổng chi phí phát sinh:{" "}
            <span className="font-bold">
              {formatCurrency(totalExtraExpenses)}
            </span>
          </p>
        )}
      </div>

      <div className="mt-3 sm:mt-4 text-xs text-muted-foreground">
        <p className="text-center">
          Thành viên cứng được miễn phí sân và chi phí phát sinh. Người nhập chi
          phí phát sinh sẽ được trừ vào phần chi phí phải trả.
        </p>
      </div>
    </div>
  );
};

export default StatisticsTable;
