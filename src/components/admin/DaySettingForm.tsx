
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  fetchLocations,
  upsertDaySetting,
} from "@/utils/api";

const daySettingSchema = z.object({
  day_of_week: z.coerce.number().min(0).max(6),
  play_time: z.string().min(5, "Thời gian là bắt buộc"),
  court_count: z.coerce.number().min(1, "Phải có ít nhất 1 sân"),
  location_id: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

const dayNames = [
  "Chủ nhật",
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
];

type DaySettingFormProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  daySetting?: {
    id: string;
    day_of_week: number;
    play_time: string;
    court_count: number;
    location_id: string | null;
    is_active: boolean;
  };
};

export default function DaySettingForm({
  open,
  onClose,
  onSuccess,
  daySetting,
}: DaySettingFormProps) {
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<Array<{ id: string; name: string; address?: string }>>([]);
  
  const form = useForm<z.infer<typeof daySettingSchema>>({
    resolver: zodResolver(daySettingSchema),
    defaultValues: {
      day_of_week: daySetting?.day_of_week ?? 0,
      play_time: daySetting?.play_time || "19:00-21:00",
      court_count: daySetting?.court_count || 1,
      location_id: daySetting?.location_id || null,
      is_active: daySetting?.is_active ?? true,
    },
  });

  useEffect(() => {
    const loadLocations = async () => {
      const data = await fetchLocations();
      setLocations(data);
    };
    
    loadLocations();
  }, []);

  const handleSubmit = async (values: z.infer<typeof daySettingSchema>) => {
    setLoading(true);

    try {
      await upsertDaySetting({
        id: daySetting?.id,
        day_of_week: values.day_of_week,
        play_time: values.play_time,
        court_count: values.court_count,
        location_id: values.location_id || null,
        is_active: values.is_active,
      });
      
      toast.success(daySetting ? "Đã cập nhật lịch chơi" : "Đã thêm lịch chơi mới");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error saving day setting:", error);
      toast.error("Có lỗi xảy ra khi lưu lịch chơi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>
            {daySetting ? "Chỉnh sửa lịch chơi" : "Thêm lịch chơi mới"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="day_of_week"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ngày trong tuần</FormLabel>
                  <Select
                    value={field.value.toString()}
                    onValueChange={(value) => field.onChange(parseInt(value, 10))}
                    disabled={daySetting !== undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn ngày trong tuần" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {dayNames.map((day, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="play_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Thời gian chơi</FormLabel>
                  <FormControl>
                    <Input placeholder="VD: 19:00-21:00" {...field} />
                  </FormControl>
                  <FormDescription>Định dạng: HH:MM-HH:MM</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="court_count"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Số sân</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="1" 
                      placeholder="Số sân" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="location_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Địa điểm</FormLabel>
                  <Select
                    value={field.value || ""}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn địa điểm" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Không có địa điểm</SelectItem>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Kích hoạt
                    </FormLabel>
                    <FormDescription>
                      Chỉ những ngày được kích hoạt mới tạo ra lịch chơi
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Đang lưu..." : "Lưu"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
