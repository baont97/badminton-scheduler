import { supabase } from "@/integrations/supabase/client";
import { Member } from "../schedulerUtils";

// Fetch all users from the profiles table
export async function fetchUsers(): Promise<Member[]> {
  try {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*");

    if (error) throw error;

    // Also fetch core members to mark them accordingly
    const { data: coreMembers, error: coreError } = await supabase
      .from("core_members")
      .select("user_id");

    if (coreError) throw coreError;

    // Map profiles to Member format
    return profiles.map((profile) => ({
      id: profile.id,
      name: profile.user_name || "Unnamed User",
      isCore: coreMembers.some((cm) => cm.user_id === profile.id),
      avatarUrl: profile.avatar_url,
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
export async function toggleCoreMember(
  userId: string,
  isCore: boolean
): Promise<boolean> {
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

// Delete a member (admin only)
export async function deleteMember(userId: string): Promise<boolean> {
  try {
    // First, check if current user is admin
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      console.error("Only admins can delete members");
      return false;
    }

    // Delete from core_members first (if exists)
    await supabase
      .from("core_members")
      .delete()
      .eq("user_id", userId);

    // Delete from badminton_participants
    await supabase
      .from("badminton_participants")
      .delete()
      .eq("user_id", userId);

    // Delete from extra_expenses
    await supabase
      .from("extra_expenses")
      .delete()
      .eq("user_id", userId);

    // Finally, delete from profiles
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    return !error;
  } catch (error) {
    console.error("Error deleting member:", error);
    return false;
  }
}
