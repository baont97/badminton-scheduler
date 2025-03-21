
import React, { useState, useEffect } from "react";
import { Member } from "@/utils/schedulerUtils";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fetchUsers, toggleCoreMember, isCurrentUserAdmin } from "@/utils/apiUtils";
import { useAuth } from "@/contexts/AuthContext";

interface MemberListProps {
  members: Member[];
  onUpdateMembers: (members: Member[]) => void;
}

const MemberList: React.FC<MemberListProps> = ({ members, onUpdateMembers }) => {
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();
  const isAdmin = profile?.is_admin === true;

  const toggleCoreMemberStatus = async (member: Member) => {
    if (!isAdmin) {
      toast.error("Bạn không có quyền quản lý thành viên cứng");
      return;
    }
    
    setLoading(true);
    const success = await toggleCoreMember(member.id, member.isCore);
    
    if (success) {
      const updatedMembers = members.map(m => {
        if (m.id === member.id) {
          return {
            ...m,
            isCore: !m.isCore
          };
        }
        return m;
      });
      
      onUpdateMembers(updatedMembers);
      
      if (!member.isCore) {
        toast.success(`${member.name} đã được thêm vào danh sách thành viên cứng`);
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
        <h2 className="text-lg font-medium">Danh sách thành viên</h2>
        <div className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-badminton-light text-badminton-dark">
          {members.length} người
        </div>
      </div>
      
      <div className="space-y-3">
        {members.map(member => (
          <div 
            key={member.id}
            className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-badminton hover:bg-badminton-light/20 transition-all duration-200"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-badminton flex items-center justify-center text-white text-sm">
                {member.name.charAt(0)}
              </div>
              <span className="font-medium">{member.name}</span>
              {member.isCore && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-badminton-light text-badminton-dark">
                  Thành viên cứng
                </span>
              )}
            </div>
            
            {isAdmin && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground mr-1">Thành viên cứng</span>
                <Switch 
                  checked={member.isCore}
                  onCheckedChange={() => toggleCoreMemberStatus(member)}
                  disabled={loading}
                  className="data-[state=checked]:bg-badminton"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MemberList;
