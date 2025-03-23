
import { supabase } from "@/integrations/supabase/client";
import { Member, CalendarDay } from "./schedulerUtils";

// Fetch all users from the profiles table
export async function fetchUsers(): Promise<Member[]> {
  try {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, full_name");
      
    if (error) throw error;
    
    // Also fetch core members to mark them accordingly
    const { data: coreMembers, error: coreError } = await supabase
      .from("core_members")
      .select("user_id");
      
    if (coreError) throw coreError;
    
    // Map profiles to Member format
    return profiles.map(profile => ({
      id: profile.id,
      name: profile.full_name || "Unnamed User",
      isCore: coreMembers.some(cm => cm.user_id === profile.id)
    }));
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

// Check if the current user is an admin
export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) return false;
    
    const { data, error } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", session.session.user.id)
      .single();
      
    if (error) throw error;
    
    return data?.is_admin === true;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

// Toggle core member status
export async function toggleCoreMember(userId: string, isCore: boolean): Promise<boolean> {
  try {
    if (isCore) {
      // Remove core member status
      const { error } = await supabase
        .from("core_members")
        .delete()
        .eq("user_id", userId);
        
      return !error;
    } else {
      // Add core member status
      const { error } = await supabase
        .from("core_members")
        .insert({ user_id: userId });
        
      return !error;
    }
  } catch (error) {
    console.error("Error toggling core member status:", error);
    return false;
  }
}

// Fetch participants for a specific day
export async function fetchDayParticipants(dayId: string): Promise<{ userId: string, hasPaid: boolean }[]> {
  try {
    const { data, error } = await supabase
      .from("badminton_participants")
      .select("user_id, has_paid")
      .eq("day_id", dayId);
      
    if (error) throw error;
    
    return data.map(participant => ({
      userId: participant.user_id,
      hasPaid: participant.has_paid || false
    }));
  } catch (error) {
    console.error("Error fetching day participants:", error);
    return [];
  }
}

// Toggle user participation in a day
export async function toggleParticipation(dayId: string, userId: string, isParticipating: boolean): Promise<boolean> {
  try {
    if (isParticipating) {
      // Remove participation
      const { error } = await supabase
        .from("badminton_participants")
        .delete()
        .eq("day_id", dayId)
        .eq("user_id", userId);
        
      return !error;
    } else {
      // Add participation
      const { error } = await supabase
        .from("badminton_participants")
        .insert({ 
          day_id: dayId, 
          user_id: userId,
          has_paid: false 
        });
        
      return !error;
    }
  } catch (error) {
    console.error("Error toggling participation:", error);
    return false;
  }
}

// Mark payment status for a participant
export async function markPaymentStatus(dayId: string, userId: string, hasPaid: boolean): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("badminton_participants")
      .update({ has_paid: hasPaid })
      .eq("day_id", dayId)
      .eq("user_id", userId);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error updating payment status:", error);
    return false;
  }
}

// Fetch badminton settings
export async function fetchBadmintonSettings() {
  try {
    const { data, error } = await supabase
      .from("badminton_settings")
      .select("*")
      .limit(1)
      .single();
      
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error("Error fetching badminton settings:", error);
    return null;
  }
}

// Update badminton settings (admin only)
export async function updateBadmintonSettings(settings: {
  session_price: number;
  max_members: number;
  play_days: number[];
  play_time: string;
}) {
  try {
    const { data, error } = await supabase.rpc(
      'update_badminton_settings',
      {
        _session_price: settings.session_price,
        _max_members: settings.max_members,
        _play_days: settings.play_days,
        _play_time: settings.play_time,
      }
    );
    
    if (error) {
      console.error("Error details:", error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("Error updating badminton settings:", error);
    return false;
  }
}

// Generate badminton days for a specific month
export async function generateBadmintonDays(year: number, month: number) {
  try {
    const { data, error } = await supabase.rpc(
      'generate_badminton_days',
      {
        _year: year,
        _month: month,
      }
    );
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error("Error generating badminton days:", error);
    return [];
  }
}

// Fetch badminton days for a specific month
export async function fetchBadmintonDays(year: number, month: number): Promise<CalendarDay[]> {
  try {
    // First, ensure days are generated for this month
    await generateBadmintonDays(year, month);
    
    // Then fetch the days
    const { data, error } = await supabase
      .from("badminton_days")
      .select("*")
      .gte("date", `${year}-${month.toString().padStart(2, '0')}-01`)
      .lt("date", `${year}-${(month + 1).toString().padStart(2, '0')}-01`);
      
    if (error) throw error;
    
    // Convert to CalendarDay format
    const calendarDays: CalendarDay[] = await Promise.all(
      data.map(async (day) => {
        const participants = await fetchDayParticipants(day.id);
        return {
          id: day.id,
          date: new Date(day.date).toISOString(),
          dayOfWeek: day.day_of_week,
          isActive: day.is_active,
          members: participants.map(p => p.userId),
          paidMembers: participants.filter(p => p.hasPaid).map(p => p.userId),
          maxMembers: day.max_members,
          sessionCost: day.session_cost,
          sessionTime: day.session_time
        };
      })
    );
    
    return calendarDays;
  } catch (error) {
    console.error("Error fetching badminton days:", error);
    return [];
  }
}
