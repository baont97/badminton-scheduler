import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import CryptoJS from "crypto-js";
import { AUTH_CONFIG } from "@/config/auth";

const pinSchema = z
  .object({
    email: z.string().email("Email không hợp lệ"),
    password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
    pin: z
      .string()
      .length(AUTH_CONFIG.pin.length, `PIN phải có ${AUTH_CONFIG.pin.length} chữ số`)
      .regex(/^\d+$/, "PIN chỉ được chứa chữ số"),
    confirmPin: z
      .string()
      .length(AUTH_CONFIG.pin.length, `PIN phải có ${AUTH_CONFIG.pin.length} chữ số`)
      .regex(/^\d+$/, "PIN chỉ được chứa chữ số"),
  })
  .refine((data) => data.pin === data.confirmPin, {
    message: "PIN không khớp",
    path: ["confirmPin"],
  });

type PinFormValues = z.infer<typeof pinSchema>;

const PinSetup = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  const form = useForm<PinFormValues>({
    resolver: zodResolver(pinSchema),
    defaultValues: {
      email: "",
      password: "",
      pin: "",
      confirmPin: "",
    },
  });

  const handleSubmit = async (values: PinFormValues) => {
    if (!user) return;

    setLoading(true);

    try {
      // Encrypt credentials with PIN
      const credentials = {
        email: values.email,
        password: values.password,
      };

      const encryptedCredentials = CryptoJS.AES.encrypt(
        JSON.stringify(credentials),
        values.pin
      ).toString();

      // Save encrypted credentials to localStorage
      localStorage.setItem("encrypted_credentials", encryptedCredentials);

      toast.success("Đã cài đặt PIN thành công!");
      form.reset();
    } catch (error: any) {
      console.error("Error setting up PIN:", error);
      toast.error(error.message || "Có lỗi xảy ra khi cài đặt PIN");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cài đặt PIN</CardTitle>
        <CardDescription>
          Cài đặt PIN 4 chữ số để đăng nhập nhanh chóng
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Nhập email của bạn"
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
                      placeholder="Nhập mật khẩu của bạn"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PIN</FormLabel>
                  <FormControl>
                    <div className="flex gap-2 justify-center">
                      {Array.from({ length: AUTH_CONFIG.pin.length }).map((_, index) => (
                        <Input
                          key={index}
                          type="number"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={1}
                          className="w-12 h-12 text-center text-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          value={field.value[index] || ""}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            if (newValue.length > 1) return;
                            if (!/^\d*$/.test(newValue)) return;
                            
                            const currentValue = field.value.split("");
                            currentValue[index] = newValue;
                            const newPin = currentValue.join("");
                            
                            // Auto-focus next input
                            if (newValue && index < AUTH_CONFIG.pin.length - 1) {
                              const nextInput = document.querySelector(
                                `input[name="pin-${index + 1}"]`
                              ) as HTMLInputElement;
                              nextInput?.focus();
                            }
                            
                            field.onChange(newPin);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Backspace" && !field.value[index] && index > 0) {
                              const prevInput = document.querySelector(
                                `input[name="pin-${index - 1}"]`
                              ) as HTMLInputElement;
                              prevInput?.focus();
                            }
                          }}
                          name={`pin-${index}`}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Xác nhận PIN</FormLabel>
                  <FormControl>
                    <div className="flex gap-2 justify-center">
                      {Array.from({ length: AUTH_CONFIG.pin.length }).map((_, index) => (
                        <Input
                          key={index}
                          type="number"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={1}
                          className="w-12 h-12 text-center text-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          value={field.value[index] || ""}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            if (newValue.length > 1) return;
                            if (!/^\d*$/.test(newValue)) return;
                            
                            const currentValue = field.value.split("");
                            currentValue[index] = newValue;
                            const newPin = currentValue.join("");
                            
                            // Auto-focus next input
                            if (newValue && index < AUTH_CONFIG.pin.length - 1) {
                              const nextInput = document.querySelector(
                                `input[name="confirmPin-${index + 1}"]`
                              ) as HTMLInputElement;
                              nextInput?.focus();
                            }
                            
                            field.onChange(newPin);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Backspace" && !field.value[index] && index > 0) {
                              const prevInput = document.querySelector(
                                `input[name="confirmPin-${index - 1}"]`
                              ) as HTMLInputElement;
                              prevInput?.focus();
                            }
                          }}
                          name={`confirmPin-${index}`}
                        />
                      ))}
                    </div>
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
              {loading ? "Đang xử lý..." : "Cài đặt PIN"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default PinSetup;
