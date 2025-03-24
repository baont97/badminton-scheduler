
import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const createUserSchema = z.object({
  userName: z.string().min(3, "Tên người dùng phải có ít nhất 3 ký tự"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

const CreateUserForm = () => {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      userName: "",
      email: "",
      password: "",
    },
  });

  const handleSubmit = async (values: CreateUserFormValues) => {
    setIsLoading(true);
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        toast.error("Bạn cần đăng nhập để thực hiện thao tác này");
        return;
      }

      const response = await supabase.functions.invoke("create-user", {
        body: {
          userName: values.userName,
          email: values.email,
          password: values.password,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Có lỗi xảy ra khi tạo tài khoản");
      }

      if (response.data?.success) {
        toast.success("Tạo tài khoản thành công");
        form.reset();
      } else {
        toast.error(response.data?.error || "Có lỗi xảy ra khi tạo tài khoản");
      }
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(error.message || "Có lỗi xảy ra khi tạo tài khoản");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tạo tài khoản mới</CardTitle>
        <CardDescription>
          Tạo tài khoản mới cho người dùng tham gia vào hệ thống
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="userName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên người dùng</FormLabel>
                  <FormControl>
                    <Input placeholder="Nhập tên người dùng" {...field} />
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
                    <Input 
                      type="email" 
                      placeholder="Nhập email" 
                      {...field} 
                    />
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
                    <Input 
                      type="password" 
                      placeholder="Nhập mật khẩu" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full bg-badminton hover:bg-badminton/80"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                "Tạo tài khoản"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default CreateUserForm;
