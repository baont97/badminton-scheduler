
import React, { useState } from "react";
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createLocation, updateLocation } from "@/utils/api";

const locationSchema = z.object({
  name: z.string().min(1, "Tên địa điểm là bắt buộc"),
  address: z.string().optional(),
});

type LocationFormProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  location?: {
    id: string;
    name: string;
    address?: string;
  };
};

export default function LocationForm({
  open,
  onClose,
  onSuccess,
  location,
}: LocationFormProps) {
  const [loading, setLoading] = useState(false);
  
  const form = useForm<z.infer<typeof locationSchema>>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: location?.name || "",
      address: location?.address || "",
    },
  });

  const handleSubmit = async (values: z.infer<typeof locationSchema>) => {
    setLoading(true);

    try {
      if (location?.id) {
        // Update existing location
        await updateLocation(location.id, {
          name: values.name,
          address: values.address,
        });
        
        toast.success("Đã cập nhật địa điểm");
      } else {
        // Create new location
        await createLocation({
          name: values.name,
          address: values.address,
        });
        
        toast.success("Đã thêm địa điểm mới");
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error saving location:", error);
      toast.error("Có lỗi xảy ra khi lưu địa điểm");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {location ? "Chỉnh sửa địa điểm" : "Thêm địa điểm mới"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên địa điểm</FormLabel>
                  <FormControl>
                    <Input placeholder="Nhập tên địa điểm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Địa chỉ</FormLabel>
                  <FormControl>
                    <Input placeholder="Nhập địa chỉ" {...field} />
                  </FormControl>
                  <FormMessage />
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
