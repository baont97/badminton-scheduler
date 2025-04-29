import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  fetchBadmintonSettings,
  updateBadmintonSettings,
  regenerateCurrentMonthDays,
  fetchLocations,
  deleteLocation,
  fetchDaySettings,
  deleteDaySetting
} from "@/utils/api";

const settingsSchema = z.object({
  sessionPrice: z.string().regex(/^\d+$/, "Vui lòng nhập số"),
  maxMembers: z.string().regex(/^\d+$/, "Vui lòng nhập số"),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

type Location = {
  id: string;
  name: string;
  address: string | null;
  created_at: string;
};

type DaySetting = {
  id: string;
  day_of_week: number;
  play_time: string;
  court_count: number;
  location_id: string | null;
  is_active: boolean;
  location?: {
    id: string;
    name: string;
    address: string | null;
  } | null;
};

const dayNames = [
  "Chủ nhật",
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
];

const BadmintonSettings = () => {
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [daySettings, setDaySettings] = useState<DaySetting[]>([]);
  const [locationFormOpen, setLocationFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [daySettingFormOpen, setDaySettingFormOpen] = useState(false);
  const [editingDaySetting, setEditingDaySetting] = useState<DaySetting | null>(null);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      sessionPrice: "260000",
      maxMembers: "10",
    },
  });

  useEffect(() => {
    loadBadmintonSettings();
    loadLocations();
    loadDaySettings();
  }, []);

  const loadBadmintonSettings = async () => {
    try {
      const settings = await fetchBadmintonSettings();
      if (settings) {
        form.reset({
          sessionPrice: settings.session_price.toString(),
          maxMembers: settings.max_members.toString(),
        });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Không thể tải cài đặt");
    }
  };

  const loadLocations = async () => {
    try {
      const data = await fetchLocations();
      setLocations(data || []);
    } catch (error) {
      console.error("Error loading locations:", error);
      toast.error("Không thể tải danh sách địa điểm");
    }
  };

  const loadDaySettings = async () => {
    try {
      const data = await fetchDaySettings();
      setDaySettings(data || []);
    } catch (error) {
      console.error("Error loading day settings:", error);
      toast.error("Không thể tải cài đặt ngày chơi");
    }
  };

  const handleSaveSettings = async (data: SettingsFormValues) => {
    setLoading(true);
    try {
      const success = await updateBadmintonSettings({
        session_price: parseInt(data.sessionPrice),
        max_members: parseInt(data.maxMembers),
      });
      
      if (success) {
        toast.success("Cài đặt đã được lưu", {
          description: "Thay đổi sẽ được áp dụng cho các buổi tập sắp tới"
        });
        await regenerateCurrentMonthDays();
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

  const handleDeleteLocation = async (id: string) => {
    const confirmed = window.confirm("Bạn có chắc muốn xóa địa điểm này?");
    if (!confirmed) return;
    
    try {
      const success = await deleteLocation(id);
      if (success) {
        toast.success("Đã xóa địa điểm");
        loadLocations();
        loadDaySettings();
      } else {
        toast.error("Không thể xóa địa điểm");
      }
    } catch (error) {
      console.error("Error deleting location:", error);
      toast.error("Có lỗi xảy ra khi xóa địa điểm");
    }
  };

  const handleDeleteDaySetting = async (id: string) => {
    const confirmed = window.confirm("Bạn có chắc muốn xóa lịch chơi này?");
    if (!confirmed) return;
    
    try {
      const success = await deleteDaySetting(id);
      if (success) {
        toast.success("Đã xóa lịch chơi");
        loadDaySettings();
      } else {
        toast.error("Không thể xóa lịch chơi");
      }
    } catch (error) {
      console.error("Error deleting day setting:", error);
      toast.error("Có lỗi xảy ra khi xóa lịch chơi");
    }
  };

  return (
    <>
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="general">Cài đặt chung</TabsTrigger>
          <TabsTrigger value="locations">Địa điểm</TabsTrigger>
          <TabsTrigger value="schedule">Lịch trình</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card className="mx-auto max-w-lg">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Cài đặt chung</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Thiết lập các thông số chung cho hoạt động đánh cầu
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
        </TabsContent>

        <TabsContent value="locations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Quản lý địa điểm</CardTitle>
                <CardDescription>
                  Thêm, sửa hoặc xóa các địa điểm đánh cầu
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  setEditingLocation(null);
                  setLocationFormOpen(true);
                }}
              >
                Thêm địa điểm
              </Button>
            </CardHeader>
            <CardContent>
              {locations.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  Chưa có địa điểm nào. Hãy thêm địa điểm mới.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên địa điểm</TableHead>
                      <TableHead>Địa chỉ</TableHead>
                      <TableHead className="text-right">Tác vụ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locations.map((location) => (
                      <TableRow key={location.id}>
                        <TableCell className="font-medium">
                          {location.name}
                        </TableCell>
                        <TableCell>{location.address || "—"}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                Tác vụ
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingLocation(location);
                                  setLocationFormOpen(true);
                                }}
                              >
                                Chỉnh sửa
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteLocation(location.id)}
                                className="text-destructive"
                              >
                                Xóa
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Quản lý lịch chơi</CardTitle>
                <CardDescription>
                  Thiết lập lịch chơi cho từng ngày trong tuần
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  setEditingDaySetting(null);
                  setDaySettingFormOpen(true);
                }}
              >
                Thêm lịch chơi
              </Button>
            </CardHeader>
            <CardContent>
              {daySettings.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  Chưa có lịch chơi nào. Hãy thêm lịch chơi mới.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ngày</TableHead>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Số sân</TableHead>
                      <TableHead>Địa điểm</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Tác vụ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {daySettings.map((setting) => (
                      <TableRow key={setting.id}>
                        <TableCell className="font-medium">
                          {dayNames[setting.day_of_week]}
                        </TableCell>
                        <TableCell>{setting.play_time}</TableCell>
                        <TableCell>{setting.court_count}</TableCell>
                        <TableCell>
                          {setting.location?.name || "—"}
                        </TableCell>
                        <TableCell>
                          {setting.is_active ? (
                            <Badge variant="default" className="bg-green-500">Kích hoạt</Badge>
                          ) : (
                            <Badge variant="outline">Vô hiệu</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                Tác vụ
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingDaySetting(setting);
                                  setDaySettingFormOpen(true);
                                }}
                              >
                                Chỉnh sửa
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteDaySetting(setting.id)}
                                className="text-destructive"
                              >
                                Xóa
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            <CardFooter className="flex justify-between border-t px-6 py-4">
              <div className="text-sm text-muted-foreground">
                Lịch chơi sẽ được áp dụng khi tạo lịch hàng tháng
              </div>
              <Button size="sm" onClick={async () => {
                try {
                  await regenerateCurrentMonthDays();
                  toast.success("Đã tạo lịch cho tháng hiện tại");
                } catch (error) {
                  toast.error("Có lỗi xảy ra khi tạo lịch");
                }
              }}>
                Tạo lịch tháng này
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {locationFormOpen && (
        <LocationForm
          open={locationFormOpen}
          onClose={() => setLocationFormOpen(false)}
          onSuccess={() => loadLocations()}
          location={editingLocation || undefined}
        />
      )}

      {daySettingFormOpen && (
        <DaySettingForm
          open={daySettingFormOpen}
          onClose={() => setDaySettingFormOpen(false)}
          onSuccess={() => loadDaySettings()}
          daySetting={editingDaySetting || undefined}
        />
      )}
    </>
  );
};

export default BadmintonSettings;
