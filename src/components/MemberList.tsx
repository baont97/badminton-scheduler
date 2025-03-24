import React, { useState } from "react";
import { Member } from "@/utils/schedulerUtils";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { toggleCoreMember } from "@/utils/apiUtils";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Info, Star } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";

interface MemberListProps {
  members: Member[];
  onUpdateMembers: (members: Member[]) => void;
}

const MemberList: React.FC<MemberListProps> = ({
  members,
  onUpdateMembers,
}) => {
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();
  const isAdmin = profile?.is_admin === true;

  const toggleCoreMemberStatus = async (member: Member) => {
    if (!isAdmin) {
      toast.error("Bạn không có quyền quản lý thành viên cứng", {
        description: "Chỉ admin mới có thể thay đổi trạng thái thành viên cứng",
      });
      return;
    }

    setLoading(true);
    const success = await toggleCoreMember(member.id, member.isCore);

    if (success) {
      const updatedMembers = members.map((m) => {
        if (m.id === member.id) {
          return {
            ...m,
            isCore: !m.isCore,
          };
        }
        return m;
      });

      onUpdateMembers(updatedMembers);

      if (!member.isCore) {
        toast.success(
          `${member.name} đã được thêm vào danh sách thành viên cứng`
        );
      } else {
        toast.info(`${member.name} đã được xóa khỏi danh sách thành viên cứng`);
      }
    } else {
      toast.error("Có lỗi xảy ra khi cập nhật trạng thái thành viên");
    }

    setLoading(false);
  };

  return (
    <div className="glass-card p-6 animate-slide-up">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-medium">Danh sách thành viên</h2>
          {isAdmin && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="flex items-center gap-1 border-badminton text-badminton"
                >
                  <ShieldCheck className="h-4 w-4" />
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Bạn có quyền Admin</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-badminton-light text-badminton-dark">
          {members.length} người
        </div>
      </div>

      <div className="space-y-3">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-badminton hover:bg-badminton-light/20 transition-all duration-200"
          >
            <div className="flex items-center space-x-3">
              <Avatar className="w-6 h-6 rounded-full bg-badminton flex items-center justify-center text-white text-xs mr-2 overflow-hidden">
                {member?.avatarUrl ? (
                  <AvatarImage src={member.avatarUrl} alt={member?.name} />
                ) : (
                  <AvatarFallback className="bg-badminton text-white">
                    {member.name.charAt(0).toUpperCase() || "--"}
                  </AvatarFallback>
                )}
              </Avatar>
              <span className="font-medium">{member.name}</span>
              {member.isCore && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="secondary"
                      className="bg-badminton-light text-badminton-dark p-1"
                    >
                      <Star className="h-3 w-3 text-badminton" />
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Thành viên cứng</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground mr-1">
                Thành viên cứng
              </span>
              {isAdmin ? (
                <Switch
                  checked={member.isCore}
                  onCheckedChange={() => toggleCoreMemberStatus(member)}
                  disabled={loading}
                  className="data-[state=checked]:bg-badminton"
                />
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center">
                      <Switch
                        checked={member.isCore}
                        disabled={true}
                        className="data-[state=checked]:bg-badminton opacity-50 cursor-not-allowed"
                      />
                      <Info className="h-4 w-4 ml-1 text-muted-foreground" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      Chỉ admin mới có thể thay đổi trạng thái thành viên cứng
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MemberList;
