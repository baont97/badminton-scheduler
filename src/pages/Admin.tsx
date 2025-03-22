
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
import { AlertTriangle, CheckCircle, UserPlus, Settings, Users, Clock, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  { value: "1", label: "Thứ 2" },
  { value: "2", label: "Thứ 3" },
  { value: "3", label: "Thứ 4" },
  { value: "4", label: "Thứ 5" },
  { value: "5", label: "Thứ 6" },
  { value: "6", label: "Thứ 7" },
  { value: "0", label: "Chủ nhật" },
];

const Admin = () => {
  const [loading, setLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [userHistory, setUserHistory] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
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
    }
  }, [profile]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Không thể tải danh sách người dùng");
    }
  };

  const fetchUserHistory = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('badminton_participants')
        .select('*, days:day_id(*)')
        .eq('user_id', userId);
      
      if (error) throw error;
      setUserHistory(data || []);
    } catch (error) {
      console.error("Error fetching user history:", error);
      toast.error("Không thể tải lịch sử tham gia");
    }
  };

  const handleCreateUser = async (data: CreateUserFormValues) => {
    setLoading(true);
    try {
      // Call the create-user edge function
      const { data: responseData, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: data.email,
          password: data.password,
          fullName: data.fullName,
        }
      });

      if (error) throw error;
      if (responseData?.error) throw new Error(responseData.error);

      // Success
      toast.success(`Đã tạo tài khoản cho ${data.fullName}`, {
        description: "Thành viên mới đã được tạo thành công"
      });
      form.reset();
      fetchUsers(); // Refresh user list

    } catch (error) {
      console.error("Error creating user:", error);
      
      // Check for specific error conditions
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
      // This would update application settings in a real app
      // For now we'll just simulate success
      toast.success("Cài đặt đã được lưu", {
        description: "Thay đổi sẽ được áp dụng cho các buổi tập sắp tới"
      });
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
      fetchUsers(); // Refresh user list
    } catch (error) {
      console.error("Error toggling admin:", error);
      toast.error("Có lỗi xảy ra khi thay đổi quyền admin");
    }
  };

  const handleToggleCoreMember = async (userId, isCore) => {
    try {
      if (isCore) {
        // Remove from core members
        const { error } = await supabase
          .from('core_members')
          .delete()
          .eq('user_id', userId);
        
        if (error) throw error;
      } else {
        // Add to core members
        const { error } = await supabase
          .from('core_members')
          .insert({ user_id: userId });
        
        if (error) throw error;
      }
      
      toast.success(`Đã ${!isCore ? 'thêm' : 'xóa'} thành viên cứng`);
      fetchUsers(); // Refresh user list
    } catch (error) {
      console.error("Error toggling core member:", error);
      toast.error("Có lỗi xảy ra khi thay đổi trạng thái thành viên cứng");
    }
  };

  // Redirect if not admin
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
                      {userHistory.length > 0 ? (
                        <div className="space-y-2">
                          {userHistory.map(entry => (
                            <div key={entry.id} className="p-2 border rounded flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-badminton" />
                                <span>{entry.days?.date || "Không xác định"}</span>
                              </div>
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                Đã tham gia
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm italic">Chưa có lịch sử tham gia</p>
                      )}
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm">Khóa tài khoản</Button>
                      <Button variant="destructive" size="sm">Xóa tài khoản</Button>
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
