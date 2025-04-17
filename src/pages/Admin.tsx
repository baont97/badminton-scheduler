
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Settings, Users, UserPlus } from "lucide-react";
import CreateUserForm from "@/components/admin/CreateUserForm";
import UserManagement from "@/components/admin/UserManagement";
import BadmintonSettings from "@/components/admin/BadmintonSettings";
import { fetchUsers } from "@/utils/api";

const Admin = () => {
  const [users, setUsers] = useState([]);
  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.is_admin) {
      loadUsers();
    }
  }, [profile]);

  const loadUsers = async () => {
    try {
      const userList = await fetchUsers();
      setUsers(userList || []);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

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
          <TabsTrigger value="settings" className="flex items-center gap-1">
            <Settings className="h-4 w-4" />
            Cài Đặt
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            Quản Lý Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create-user">
          <CreateUserForm />
        </TabsContent>

        <TabsContent value="settings">
          <BadmintonSettings />
        </TabsContent>

        <TabsContent value="users">
          <UserManagement users={users} onUserUpdated={loadUsers} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
