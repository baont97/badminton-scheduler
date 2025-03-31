import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchBadmintonSettings, updateBadmintonSettings, generateBadmintonDays } from "@/utils/apiUtils";

const settingsSchema = z.object({
  sessionPrice: z.string().regex(/^\d+$/, "Vui lòng nhập số"),
  maxMembers: z.string().regex(/^\d+$/, "Vui lòng nhập số"),
  playDays: z.array(z.string()).min(1, "Vui lòng chọn ít nhất 1 ngày"),
  playTime: z.string().min(1, "Vui lòng nhập thời gian"),
});

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

const BadmintonSettings = () => {
  const [loading, setLoading] = useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      sessionPrice: "260000",
      maxMembers: "10",
      playDays: ["2", "5"], // Tuesday and Friday
      playTime: "19:00-21:00",
    },
  });

  useEffect(() => {
    loadBadmintonSettings();
  }, []);

  const loadBadmintonSettings = async () => {
    try {
      const settings = await fetchBadmintonSettings();
      if (settings) {
        form.reset({
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

  const handleSaveSettings = async (data: SettingsFormValues) => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Cài đặt hệ thống</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Thiết lập các thông số cho hoạt động đánh cầu
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSaveSettings)} className="space-y-4 sm:space-y-6">
            <FormField
              control={form.control}
              name="sessionPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Giá mỗi buổi (VND)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Nhập giá tiền" 
                      {...field} 
                      className="h-10"
                      type="number"
                      inputMode="numeric"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="maxMembers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Số người tối đa mỗi buổi</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Nhập số người" 
                      {...field} 
                      className="h-10"
                      type="number"
                      inputMode="numeric"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="playDays"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-medium">Ngày đánh cầu trong tuần</FormLabel>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {dayOptions.map(day => (
                      <Button
                        key={day.value}
                        type="button"
                        variant={field.value.includes(day.value) ? "default" : "outline"}
                        className={`h-10 px-2 text-xs sm:text-sm ${
                          field.value.includes(day.value) 
                            ? "bg-badminton hover:bg-badminton/80" 
                            : ""
                        }`}
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
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="playTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Thời gian đánh cầu</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ví dụ: 19:00-21:00" 
                      {...field} 
                      className="h-10"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            
            <Button
              type="submit"
              className="w-full h-10 bg-badminton hover:bg-badminton/80 text-sm font-medium"
              disabled={loading}
            >
              {loading ? "Đang xử lý..." : "Lưu cài đặt"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default BadmintonSettings;
