
import React, { useState } from "react";
import { Member } from "@/utils/schedulerUtils";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { toggleCoreMember, deleteMember } from "@/utils/api/userApi";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Info, UserX } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ClickableAvatar from "@/components/ClickableAvatar";

interface MemberListProps {
  members: Member[];
  onUpdateMembers: (members: Member[]) => void;
}

const MemberList: React.FC<MemberListProps> = ({
  members,
  onUpdateMembers,
}) => {
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
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

  const handleDeleteMember = async (member: Member) => {
    if (!isAdmin) {
      toast.error("Bạn không có quyền xóa thành viên", {
        description: "Chỉ admin mới có thể xóa thành viên",
      });
      return;
    }

    // Prevent deleting yourself
    if (member.id === profile?.id) {
      toast.error("Bạn không thể xóa chính mình");
      return;
    }

    setDeleteLoading(member.id);
    const success = await deleteMember(member.id);

    if (success) {
      const updatedMembers = members.filter((m) => m.id !== member.id);
      onUpdateMembers(updatedMembers);
      toast.success(`Đã xóa thành viên ${member.name} thành công`);
    } else {
      toast.error("Có lỗi xảy ra khi xóa thành viên");
    }

    setDeleteLoading(null);
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
              <ClickableAvatar
                name={member.name}
                imageUrl={member.avatarUrl}
                size="sm"
                className="mr-2"
              />
              <span className="font-medium">{member.name}</span>
            </div>

            <div className="flex items-center space-x-2">
              {isAdmin ? (
                <>
                  <Badge className="bg-badminton text-white border-none px-1.5 py-0.5 text-xs">
                    CỨNG
                  </Badge>
                  <Switch
                    checked={member.isCore}
                    onCheckedChange={() => toggleCoreMemberStatus(member)}
                    disabled={loading}
                    className="data-[state=checked]:bg-badminton"
                  />
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={deleteLoading === member.id || member.id === profile?.id}
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Xóa thành viên</AlertDialogTitle>
                        <AlertDialogDescription>
                          Bạn có chắc chắn muốn xóa thành viên "{member.name}" không? 
                          Hành động này sẽ xóa tất cả dữ liệu liên quan và không thể hoàn tác.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteMember(member)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Xóa
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
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
