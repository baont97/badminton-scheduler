
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle, UserPlus, Settings, Users, Clock, Calendar, UserX, Lock, Unlock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  fetchBadmintonSettings, 
  updateBadmintonSettings, 
  generateBadmintonDays, 
  deleteUser,
  blockUser 
} from "@/utils/apiUtils";
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

const createUserSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  fullName: z.string().min(2, "Họ và tên phải có ít nhất 2 ký tự"),
});

const settingsSchema = z.object({
  sessionPrice: z.string().regex(/^\d+$/, "Vui lòng nhập số"),
  maxMembers: z.string().regex(/^\d+$/, "Vui lòng nhập số"),
  playDays: z.array(z.string()).min(1, "Vui lòng chọn ít nhất 1 ngày"),
  playTime: z.string().min(1, "Vui lòng nhập thời gian"),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;
type SettingsFormValues = z.infer<typeof settingsSchema>;

const dayOptions = [
  { value: "0", label: "Chủ nhật" },
  { value: "1", label: "Thứ 2" },
  { value: "2", label: "Thứ 3" },
  { value: "3", label: "Thứ 4" },
  { value: "4", label: "Thứ 5" },
  { value: "5", label: "Thứ 6" },
  { value: "6", label: "Thứ 7" },
];

const Admin = () => {
  const [loading, setLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [userHistory, setUserHistory] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const { profile } = useAuth();
  
  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      password: "",
      fullName: "",
    },
  });

  const settingsForm = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      sessionPrice: "260000",
      maxMembers: "10",
      playDays: ["2", "5"], // Tuesday and Friday
      playTime: "19:00-21:00",
    },
  });

  useEffect(() => {
    if (profile?.is_admin) {
      fetchUsers();
      loadBadmintonSettings();
    }
  }, [profile]);

  const loadBadmintonSettings = async () => {
    try {
      const settings = await fetchBadmintonSettings();
      if (settings) {
        settingsForm.reset({
          sessionPrice: settings.session_price.toString(),
          maxMembers: settings.max_members.toString(),
          playDays: settings.play_days.map(day => day.toString()),
          playTime: settings.play_time,
        });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Không thể tải cài đặt");
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*");
      
      if (error) throw error;
      
      // Fetch core members to mark them accordingly
      const { data: coreMembers, error: coreError } = await supabase
        .from("core_members")
        .select("user_id");
        
      if (coreError) throw coreError;
      
      // Add is_core flag to profiles
      const updatedProfiles = profiles.map(profile => ({
        ...profile,
        is_core: coreMembers.some(cm => cm.user_id === profile.id)
      }));
      
      setUsers(updatedProfiles || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Không thể tải danh sách người dùng");
    }
  };

  const fetchUserHistory = async (userId) => {
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

  const handleCreateUser = async (data: CreateUserFormValues) => {
    setLoading(true);
    try {
      const { data: responseData, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: data.email,
          password: data.password,
          fullName: data.fullName,
        }
      });

      if (error) throw error;
      if (responseData?.error) throw new Error(responseData.error);

      toast.success(`Đã tạo tài khoản cho ${data.fullName}`, {
        description: "Thành viên mới đã được tạo thành công"
      });
      form.reset();
      fetchUsers();
    } catch (error) {
      console.error("Error creating user:", error);
      
      if (error.message.includes("already exists")) {
        toast.error("Email này đã được sử dụng", {
          description: "Vui lòng sử dụng email khác để tạo tài khoản"
        });
      } else {
        toast.error("Có lỗi xảy ra khi tạo tài khoản", {
          description: error.message || "Vui lòng thử lại sau"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (data: SettingsFormValues) => {
    setSettingsLoading(true);
    try {
      const success = await updateBadmintonSettings({
        session_price: parseInt(data.sessionPrice),
        max_members: parseInt(data.maxMembers),
        play_days: data.playDays.map(day => parseInt(day)),
        play_time: data.playTime,
      });
      
      if (success) {
        toast.success("Cài đặt đã được lưu", {
          description: "Thay đổi sẽ được áp dụng cho các buổi tập sắp tới"
        });
        const currentDate = new Date();
        await generateBadmintonDays(currentDate.getFullYear(), currentDate.getMonth() + 1);
      } else {
        toast.error("Có lỗi xảy ra khi lưu cài đặt");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Có lỗi xảy ra khi lưu cài đặt");
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleToggleAdmin = async (userId, isAdmin) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: !isAdmin })
        .eq('id', userId);
      
      if (error) throw error;
      
      toast.success(`Đã ${!isAdmin ? 'cấp' : 'hủy'} quyền admin`);
      fetchUsers();
    } catch (error) {
      console.error("Error toggling admin:", error);
      toast.error("Có lỗi xảy ra khi thay đổi quyền admin");
    }
  };

  const handleToggleCoreMember = async (userId, isCore) => {
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
      fetchUsers();
    } catch (error) {
      console.error("Error toggling core member:", error);
      toast.error("Có lỗi xảy ra khi thay đổi trạng thái thành viên cứng");
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa người dùng này không? Hành động này không thể hoàn tác.")) {
      return;
    }
    
    setDeleteLoading(true);
    try {
      const result = await deleteUser(userId);
      
      if (result.success) {
        toast.success(result.message);
        setSelectedUser(null);
        fetchUsers();
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

  const handleBlockUser = async (userId, isBlocked) => {
    setBlockLoading(true);
    try {
      const result = await blockUser(userId, isBlocked);
      
      if (result.success) {
        toast.success(result.message);
        fetchUsers();
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

  if (profile && !profile.is_admin) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="text-destructive h-5 w-5" />
              Không có quyền truy cập
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Bạn không có quyền quản trị để truy cập trang này.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-2xl font-bold mb-6">Trang Quản trị</h1>
      
      <Tabs defaultValue="create-user" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="create-user" className="flex items-center gap-1">
            <UserPlus className="h-4 w-4" />
            Tạo Tài Khoản
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1">
            <Settings className="h-4 w-4" />
            Cài Đặt
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            Quản Lý Users
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="create-user">
          <Card>
            <CardHeader>
              <CardTitle>Tạo tài khoản mới</CardTitle>
              <CardDescription>
                Tạo tài khoản mới cho thành viên tham gia lịch đánh cầu lông
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreateUser)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Họ và tên</FormLabel>
                        <FormControl>
                          <Input placeholder="Nhập họ và tên" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Nhập email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mật khẩu</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Nhập mật khẩu" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button
                    type="submit"
                    className="w-full bg-badminton hover:bg-badminton/80"
                    disabled={loading}
                  >
                    {loading ? "Đang xử lý..." : "Tạo tài khoản"}
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="bg-muted/50 flex justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Chỉ admin mới có quyền tạo tài khoản</span>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Cài đặt hệ thống</CardTitle>
              <CardDescription>
                Thiết lập các thông số cho hoạt động đánh cầu
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...settingsForm}>
                <form onSubmit={settingsForm.handleSubmit(handleSaveSettings)} className="space-y-6">
                  <FormField
                    control={settingsForm.control}
                    name="sessionPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Giá mỗi buổi (VND)</FormLabel>
                        <FormControl>
                          <Input placeholder="Nhập giá tiền" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={settingsForm.control}
                    name="maxMembers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Số người tối đa mỗi buổi</FormLabel>
                        <FormControl>
                          <Input placeholder="Nhập số người" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={settingsForm.control}
                    name="playDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ngày đánh cầu trong tuần</FormLabel>
                        <div className="grid grid-cols-7 gap-2">
                          {dayOptions.map(day => (
                            <Button
                              key={day.value}
                              type="button"
                              variant={field.value.includes(day.value) ? "default" : "outline"}
                              className={field.value.includes(day.value) ? "bg-badminton hover:bg-badminton/80" : ""}
                              onClick={() => {
                                if (field.value.includes(day.value)) {
                                  field.onChange(field.value.filter(v => v !== day.value));
                                } else {
                                  field.onChange([...field.value, day.value]);
                                }
                              }}
                            >
                              {day.label}
                            </Button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={settingsForm.control}
                    name="playTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Thời gian đánh cầu</FormLabel>
                        <FormControl>
                          <Input placeholder="Ví dụ: 19:00-21:00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button
                    type="submit"
                    className="w-full bg-badminton hover:bg-badminton/80"
                    disabled={settingsLoading}
                  >
                    {settingsLoading ? "Đang xử lý..." : "Lưu cài đặt"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="users">
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
                              {user.full_name?.charAt(0) || "?"}
                            </div>
                            <div>
                              <p className="font-medium">{user.full_name}</p>
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
                          <p className="text-sm text-muted-foreground">Họ và tên</p>
                          <p>{selectedUser.full_name}</p>
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
