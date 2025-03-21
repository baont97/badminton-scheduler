
import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  // Show a notification when redirected from a protected route
  useEffect(() => {
    if (!loading && !user && location.state?.from) {
      toast.error("Vui lòng đăng nhập để truy cập trang này");
    }
  }, [loading, user, location]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 animate-pulse">
          <p className="text-xl font-light text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Pass the current location so we can redirect back after login
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  // Check for admin-only routes
  if (adminOnly && profile?.is_admin !== true) {
    toast.error("Bạn không có quyền truy cập trang này");
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
