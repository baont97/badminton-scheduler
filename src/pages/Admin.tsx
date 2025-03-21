
import React, { useState } from "react";
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
import { AlertTriangle, CheckCircle, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const createUserSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  fullName: z.string().min(2, "Họ và tên phải có ít nhất 2 ký tự"),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

const Admin = () => {
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();
  
  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      password: "",
      fullName: "",
    },
  });

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

    } catch (error: any) {
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
          <TabsTrigger value="other">Quản lý khác</TabsTrigger>
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
        
        <TabsContent value="other">
          <Card>
            <CardHeader>
              <CardTitle>Tính năng quản lý khác</CardTitle>
              <CardDescription>
                Các tính năng quản lý khác sẽ được phát triển trong tương lai
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Chưa có tính năng quản lý khác</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
