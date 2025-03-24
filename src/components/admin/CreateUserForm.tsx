
import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

const createUserSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  userName: z.string().min(2, "Tên người dùng phải có ít nhất 2 ký tự"),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

const CreateUserForm = () => {
  const [loading, setLoading] = React.useState(false);
  
  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      password: "",
      userName: "",
    },
  });

  const handleCreateUser = async (data: CreateUserFormValues) => {
    setLoading(true);
    try {
      const { data: responseData, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: data.email,
          password: data.password,
          userName: data.userName,
        }
      });

      if (error) throw error;
      if (responseData?.error) throw new Error(responseData.error);

      toast.success(`Đã tạo tài khoản cho ${data.userName}`, {
        description: "Thành viên mới đã được tạo thành công"
      });
      form.reset();
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

  return (
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
  );
};

export default CreateUserForm;
