
import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AuthContextProps {
  session: Session | null;
  user: User | null;
  profile: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

// Try to get cached session from localStorage
const getCachedSession = (): Session | null => {
  try {
    const cachedSessionStr = localStorage.getItem('supabase.auth.session');
    if (!cachedSessionStr) return null;
    
    const cachedSession = JSON.parse(cachedSessionStr);
    // Check if session is expired
    if (cachedSession.expires_at && cachedSession.expires_at < Math.floor(Date.now() / 1000)) {
      localStorage.removeItem('supabase.auth.session');
      return null;
    }
    
    return cachedSession;
  } catch (error) {
    console.error("Error parsing cached session:", error);
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(getCachedSession());
  const [user, setUser] = useState<User | null>(session?.user || null);
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
      
      // Cache the profile data
      if (data) {
        localStorage.setItem('supabase.auth.profile', JSON.stringify(data));
      }
    } catch (error) {
      console.error("Error in fetchProfile:", error);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    // Create a timeout to prevent infinite loading and force logout on timeout
    const timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        console.warn("Auth initialization timed out after 30 seconds");
        // Force logout if initialization times out
        localStorage.removeItem('supabase.auth.session');
        localStorage.removeItem('supabase.auth.profile');
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
        toast.error("Không thể kết nối với hệ thống xác thực, vui lòng thử lại");
      }
    }, 30000);

    // Try to restore profile from cache first
    try {
      const cachedProfileStr = localStorage.getItem('supabase.auth.profile');
      if (cachedProfileStr && user) {
        const cachedProfile = JSON.parse(cachedProfileStr);
        if (cachedProfile && cachedProfile.id === user.id) {
          setProfile(cachedProfile);
        }
      }
    } catch (error) {
      console.error("Error parsing cached profile:", error);
    }

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log("Auth state changed:", event, !!newSession);
        
        if (!isMounted) return;
        
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        // Cache the session
        if (newSession) {
          localStorage.setItem('supabase.auth.session', JSON.stringify(newSession));
        } else if (event === 'SIGNED_OUT') {
          localStorage.removeItem('supabase.auth.session');
          localStorage.removeItem('supabase.auth.profile');
          setProfile(null);
        }
        
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
          setSession(existingSession);
          setUser(existingSession.user);
          localStorage.setItem('supabase.auth.session', JSON.stringify(existingSession));
          
          if (existingSession.user) {
            await fetchProfile(existingSession.user.id);
          }
        } else {
          // No session found, clear any cached data
          localStorage.removeItem('supabase.auth.session');
          localStorage.removeItem('supabase.auth.profile');
          setSession(null);
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
      localStorage.removeItem('supabase.auth.session');
      localStorage.removeItem('supabase.auth.profile');
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
      // Clear cached data
      localStorage.removeItem('supabase.auth.session');
      localStorage.removeItem('supabase.auth.profile');
      toast.success("Đăng xuất thành công");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Lỗi khi đăng xuất");
    } finally {
      setLoading(false);
    }
  };

  const value = {
    session,
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
