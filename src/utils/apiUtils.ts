
import { supabase } from "@/integrations/supabase/client";
import { Member } from "./schedulerUtils";

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
export async function fetchDayParticipants(dayId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("badminton_participants")
      .select("user_id")
      .eq("day_id", dayId);
      
    if (error) throw error;
    
    return data.map(participant => participant.user_id);
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
        .insert({ day_id: dayId, user_id: userId });
        
      return !error;
    }
  } catch (error) {
    console.error("Error toggling participation:", error);
    return false;
  }
}
