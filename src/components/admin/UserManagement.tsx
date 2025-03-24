
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
import { Calendar, Clock, Lock, Unlock, UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { deleteUser, blockUser } from "@/utils/apiUtils";

interface UserManagementProps {
  users: any[];
  onUserUpdated: () => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, onUserUpdated }) => {
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userHistory, setUserHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);

  const fetchUserHistory = async (userId: string) => {
    if (!userId) return;
    
    setHistoryLoading(true);
    setUserHistory([]);
    
    try {
      const { data, error } = await supabase
        .from('badminton_participants')
        .select('*, badminton_days:day_id(id, date)')
        .eq('user_id', userId);
      
      if (error) {
        console.error("Error details:", error);
        throw error;
      }
      
      console.log("User history data:", data);
      setUserHistory(data || []);
    } catch (error) {
      console.error("Error fetching user history:", error);
      toast.error("Không thể tải lịch sử tham gia");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleToggleAdmin = async (userId: string, isAdmin: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: !isAdmin })
        .eq('id', userId);
      
      if (error) throw error;
      
      toast.success(`Đã ${!isAdmin ? 'cấp' : 'hủy'} quyền admin`);
      onUserUpdated();
    } catch (error) {
      console.error("Error toggling admin:", error);
      toast.error("Có lỗi xảy ra khi thay đổi quyền admin");
    }
  };

  const handleToggleCoreMember = async (userId: string, isCore: boolean) => {
    try {
      if (isCore) {
        const { error } = await supabase
          .from('core_members')
          .delete()
          .eq('user_id', userId);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('core_members')
          .insert({ user_id: userId });
        
        if (error) throw error;
      }
      
      toast.success(`Đã ${!isCore ? 'thêm' : 'xóa'} thành viên cứng`);
      onUserUpdated();
    } catch (error) {
      console.error("Error toggling core member:", error);
      toast.error("Có lỗi xảy ra khi thay đổi trạng thái thành viên cứng");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setDeleteLoading(true);
    try {
      const result = await deleteUser(userId);
      
      if (result.success) {
        toast.success(result.message);
        setSelectedUser(null);
        onUserUpdated();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Có lỗi xảy ra khi xóa người dùng");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleBlockUser = async (userId: string, isBlocked: boolean) => {
    setBlockLoading(true);
    try {
      const result = await blockUser(userId, isBlocked);
      
      if (result.success) {
        toast.success(result.message);
        onUserUpdated();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Error toggling user block status:", error);
      toast.error(`Có lỗi xảy ra khi ${isBlocked ? 'mở khóa' : 'khóa'} người dùng`);
    } finally {
      setBlockLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Danh sách người dùng</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {users.map(user => (
                <div 
                  key={user.id}
                  className={`p-3 rounded-lg border ${selectedUser?.id === user.id ? 'border-badminton bg-badminton/5' : 'border-border'} hover:border-badminton cursor-pointer transition-all`}
                  onClick={() => {
                    setSelectedUser(user);
                    fetchUserHistory(user.id);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-badminton flex items-center justify-center text-white">
                        {user.user_name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="font-medium">{user.user_name}</p>
                        <p className="text-xs text-muted-foreground">ID: {user.id.substring(0, 8)}...</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {user.is_admin && <span className="text-xs bg-badminton/20 text-badminton px-2 py-0.5 rounded-full">Admin</span>}
                      {user.is_core && <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Core</span>}
                      {user.is_banned && <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">Đã khóa</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Thông tin chi tiết</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedUser ? (
            <div className="space-y-6">
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-4">Thông tin cá nhân</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Tên người dùng</p>
                    <p>{selectedUser.user_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ID</p>
                    <p className="font-mono text-sm">{selectedUser.id}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-4">Quyền hạn</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Quyền Admin</p>
                      <p className="text-sm text-muted-foreground">Quản lý hệ thống và người dùng</p>
                    </div>
                    <Switch 
                      checked={selectedUser.is_admin} 
                      onCheckedChange={() => handleToggleAdmin(selectedUser.id, selectedUser.is_admin)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Thành viên cứng</p>
                      <p className="text-sm text-muted-foreground">Tự động tham gia mọi buổi tập</p>
                    </div>
                    <Switch 
                      checked={selectedUser.is_core}
                      onCheckedChange={() => handleToggleCoreMember(selectedUser.id, selectedUser.is_core)}
                    />
                  </div>
                </div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Lịch sử tham gia
                </h3>
                {historyLoading ? (
                  <div className="flex justify-center p-4">
                    <p className="text-muted-foreground text-sm">Đang tải lịch sử...</p>
                  </div>
                ) : userHistory.length > 0 ? (
                  <div className="space-y-2">
                    {userHistory.map(entry => (
                      <div key={entry.id} className="p-2 border rounded flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-badminton" />
                          <span>{entry.badminton_days?.date ? new Date(entry.badminton_days.date).toLocaleDateString('vi-VN') : "Không xác định"}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${entry.has_paid ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                          {entry.has_paid ? 'Đã thanh toán' : 'Chưa thanh toán'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm italic">Chưa có lịch sử tham gia</p>
                )}
              </div>
              
              <div className="flex justify-end gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex items-center gap-1"
                      disabled={blockLoading}
                    >
                      {selectedUser.is_banned ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                      {selectedUser.is_banned ? "Mở khóa tài khoản" : "Khóa tài khoản"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {selectedUser.is_banned ? "Mở khóa tài khoản" : "Khóa tài khoản"}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {selectedUser.is_banned 
                          ? "Người dùng này hiện đang bị khóa. Mở khóa sẽ cho phép họ đăng nhập và sử dụng hệ thống."
                          : "Khóa tài khoản sẽ ngăn người dùng đăng nhập và sử dụng hệ thống, nhưng không xóa dữ liệu của họ."}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Hủy</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleBlockUser(selectedUser.id, selectedUser.is_banned)}
                        className={selectedUser.is_banned ? "bg-badminton hover:bg-badminton/80" : "bg-amber-500 hover:bg-amber-600"}
                      >
                        {selectedUser.is_banned ? "Mở khóa" : "Khóa"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      className="flex items-center gap-1"
                      disabled={deleteLoading}
                    >
                      <UserX className="h-4 w-4" />
                      Xóa tài khoản
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Xóa tài khoản</AlertDialogTitle>
                      <AlertDialogDescription>
                        Hành động này không thể hoàn tác. Tài khoản và tất cả dữ liệu liên quan sẽ bị xóa vĩnh viễn.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Hủy</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteUser(selectedUser.id)}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Xóa
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ) : (
            <div className="h-[400px] flex items-center justify-center">
              <p className="text-muted-foreground">Chọn một người dùng để xem chi tiết</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;
