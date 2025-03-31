import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { toast } from "sonner";
import CryptoJS from "crypto-js";
import { AUTH_CONFIG } from "@/config/auth";

// Schema for login form
const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

// Schema for PIN login
const pinSchema = z.object({
  pin: z
    .string()
    .length(AUTH_CONFIG.pin.length, `PIN phải có ${AUTH_CONFIG.pin.length} chữ số`)
    .regex(/^\d+$/, "PIN chỉ được chứa chữ số"),
});

// Schema for signup form with password confirmation
const signupSchema = z
  .object({
    userName: z.string().min(2, "Tên người dùng phải có ít nhất 2 ký tự"),
    email: z.string().email("Email không hợp lệ"),
    password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
    confirmPassword: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
    avatarUrl: z
      .string()
      .url("URL hình đại diện không hợp lệ")
      .optional()
      .or(z.literal("")),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu không khớp",
    path: ["confirmPassword"],
  });

type LoginFormValues = z.infer<typeof loginSchema>;
type PinFormValues = z.infer<typeof pinSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPinLogin, setIsPinLogin] = useState(false);

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // PIN login form
  const pinForm = useForm<PinFormValues>({
    resolver: zodResolver(pinSchema),
    defaultValues: {
      pin: "",
    },
  });

  // Signup form
  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      userName: "",
      email: "",
      password: "",
      confirmPassword: "",
      avatarUrl: "",
    },
  });

  useEffect(() => {
    // Reset error when switching between login and signup
    setError(null);

    // Check if user is already logged in
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate("/");
      }
    };

    checkUser();

    // Check if there are encrypted credentials in localStorage
    const encryptedCredentials = localStorage.getItem("encrypted_credentials");
    if (encryptedCredentials) {
      setIsPinLogin(true);
    }
  }, [navigate, isSignUp]);

  const handleLogin = async (values: LoginFormValues) => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) throw error;

      toast.success("Đăng nhập thành công!");
      navigate("/");
    } catch (error: any) {
      console.error("Authentication error:", error);
      setError(error.message || "Có lỗi xảy ra trong quá trình xác thực");
    } finally {
      setLoading(false);
    }
  };

  const handlePinLogin = async (values: PinFormValues) => {
    setLoading(true);
    setError(null);

    try {
      const encryptedCredentials = localStorage.getItem("encrypted_credentials");
      if (!encryptedCredentials) {
        throw new Error("Không tìm thấy thông tin đăng nhập");
      }

      // Decrypt credentials
      const bytes = CryptoJS.AES.decrypt(encryptedCredentials, values.pin);
      const credentials = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

      // Login with decrypted credentials
      const { error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) throw error;

      toast.success("Đăng nhập thành công!");
      navigate("/");
    } catch (error: any) {
      console.error("PIN login error:", error);
      setError("PIN không chính xác. Vui lòng thử lại.");
      pinForm.setValue("pin", "");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (values: SignupFormValues) => {
    setLoading(true);
    setError(null);

    try {
      // Sign up with email and password
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            user_name: values.userName,
            avatar_url: values.avatarUrl || null,
          },
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      toast.success("Đăng ký thành công!");
      navigate("/");
    } catch (error: any) {
      console.error("Registration error:", error);
      setError(error.message || "Có lỗi xảy ra trong quá trình đăng ký");
    } finally {
      setLoading(false);
    }
  };

  const handleClearCredentials = () => {
    localStorage.removeItem("encrypted_credentials");
    setIsPinLogin(false);
    toast.success("Đã xóa thông tin đăng nhập");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-badminton-light text-badminton mb-2">
            Badminton Scheduler Pro
          </div>
          <h1 className="text-3xl font-bold">
            {isSignUp
              ? "Tạo tài khoản mới"
              : isPinLogin
              ? "Nhập PIN"
              : "Đăng nhập"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isSignUp
              ? "Đăng ký để tham gia lịch đánh cầu lông"
              : isPinLogin
              ? "Nhập PIN 4 chữ số để đăng nhập"
              : "Đăng nhập để quản lý lịch đánh cầu lông"}
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isSignUp ? (
          <Form key="sign-up" {...signupForm}>
            <form
              onSubmit={signupForm.handleSubmit(handleSignup)}
              className="space-y-4"
            >
              <FormField
                control={signupForm.control}
                name="userName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên người dùng</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nhập tên người dùng của bạn"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={signupForm.control}
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
                control={signupForm.control}
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
                control={signupForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Xác nhận mật khẩu</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Nhập lại mật khẩu của bạn"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={signupForm.control}
                name="avatarUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL hình đại diện (không bắt buộc)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nhập URL hình đại diện của bạn"
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
                disabled={loading}
              >
                {loading ? "Đang xử lý..." : "Đăng ký"}
              </Button>
            </form>
          </Form>
        ) : isPinLogin ? (
          <Form key="pin-login" {...pinForm}>
            <form
              onSubmit={pinForm.handleSubmit(handlePinLogin)}
              className="space-y-4"
            >
              <FormField
                control={pinForm.control}
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

              <Button
                type="submit"
                className="w-full bg-badminton hover:bg-badminton/80"
                disabled={loading}
              >
                {loading ? "Đang xử lý..." : "Đăng nhập với PIN"}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleClearCredentials}
              >
                Đăng nhập bằng tài khoản khác
              </Button>
            </form>
          </Form>
        ) : (
          <Form key="login" {...loginForm}>
            <form
              onSubmit={loginForm.handleSubmit(handleLogin)}
              className="space-y-4"
            >
              <FormField
                control={loginForm.control}
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
                control={loginForm.control}
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

              <Button
                type="submit"
                className="w-full bg-badminton hover:bg-badminton/80"
                disabled={loading}
              >
                {loading ? "Đang xử lý..." : "Đăng nhập"}
              </Button>
            </form>
          </Form>
        )}

        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setIsPinLogin(false);
              setError(null);
            }}
            className="text-sm text-badminton hover:underline"
          >
            {isSignUp
              ? "Đã có tài khoản? Đăng nhập ngay"
              : "Chưa có tài khoản? Đăng ký ngay"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
