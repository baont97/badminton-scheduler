
import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AuthContextProps {
  user: User | null;
  profile: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const fetchProfile = async (userId: string) => {
    try {
      console.log("Fetching profile for user:", userId);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        return;
      }

      console.log("Profile data:", data);
      setProfile(data);
    } catch (error) {
      console.error("Error in fetchProfile:", error);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    // Create a timeout to prevent infinite loading and force logout on timeout
    const timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        console.warn("Auth initialization timed out after 10 seconds");
        // Force logout if initialization times out
        setUser(null);
        setProfile(null);
        setLoading(false);
        toast.error("Không thể kết nối với hệ thống xác thực, vui lòng thử lại");
      }
    }, 10000);

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log("Auth state changed:", event, !!newSession);
        
        if (!isMounted) return;
        
        setUser(newSession?.user ?? null);
        
        if (newSession?.user) {
          await fetchProfile(newSession.user.id);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
        }
        
        // Ensure loading is set to false after auth state is updated
        setLoading(false);
        setInitialized(true);
      }
    );

    // THEN check for existing session
    const initializeAuth = async () => {
      try {
        console.log("Initializing auth...");
        const { data: { session: existingSession }, error } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (error) {
          console.error("Error getting session:", error);
          toast.error("Không thể kết nối với hệ thống xác thực");
          setLoading(false);
          return;
        }
        
        console.log("Initial session check:", !!existingSession);
        
        if (existingSession) {
          setUser(existingSession.user);
          
          if (existingSession.user) {
            await fetchProfile(existingSession.user.id);
          }
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        toast.error("Đã xảy ra lỗi khi khởi tạo xác thực");
      } finally {
        if (isMounted) {
          setLoading(false);
          clearTimeout(timeoutId);
          setInitialized(true);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  // Add another effect that will force logout if initialization failed
  useEffect(() => {
    if (initialized && !user && !loading) {
      // Authentication is initialized but no user is found
      // This means auth failed or user is not logged in
    }
  }, [initialized, user, loading]);

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      toast.success("Đăng xuất thành công");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Lỗi khi đăng xuất");
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    profile,
    loading,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
