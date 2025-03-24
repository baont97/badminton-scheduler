
import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Profile = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [userName, setUserName] = useState(profile?.user_name || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [loading, setLoading] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          user_name: userName,
          avatar_url: avatarUrl 
        })
        .eq("id", user.id);
        
      if (error) throw error;
      
      await refreshProfile();
      toast.success("Cập nhật thông tin thành công!");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Có lỗi xảy ra khi cập nhật thông tin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6">Hồ sơ của tôi</h1>
        
        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div>
            <label htmlFor="userName" className="block text-sm font-medium mb-1">
              Tên người dùng
            </label>
            <Input
              id="userName"
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Nhập tên người dùng của bạn"
            />
          </div>
          
          <div>
            <label htmlFor="avatarUrl" className="block text-sm font-medium mb-1">
              URL hình đại diện
            </label>
            <Input
              id="avatarUrl"
              type="text"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="Nhập URL hình đại diện của bạn"
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-badminton hover:bg-badminton/80" 
            disabled={loading}
          >
            {loading ? "Đang cập nhật..." : "Cập nhật thông tin"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
