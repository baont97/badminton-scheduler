
import React, { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const createUserSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  fullName: z.string().min(2, "Họ và tên phải có ít nhất 2 ký tự"),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

const Admin = () => {
  const [loading, setLoading] = useState(false);

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
      toast.success(`Đã tạo tài khoản cho ${data.fullName}`);
      form.reset();

    } catch (error: any) {
      console.error("Error creating user:", error);
      
      // Check for specific error conditions
      if (error.message.includes("already exists")) {
        toast.error("Email này đã được sử dụng");
      } else {
        toast.error(error.message || "Có lỗi xảy ra khi tạo tài khoản");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-2xl font-bold mb-6">Trang Quản trị</h1>
      
      <Tabs defaultValue="create-user" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="create-user">Tạo Tài Khoản</TabsTrigger>
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
