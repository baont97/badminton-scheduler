
import { supabase } from "@/integrations/supabase/client";

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
    const { data, error } = await supabase.rpc("update_badminton_settings", {
      _session_price: settings.session_price,
      _max_members: settings.max_members,
      _play_days: settings.play_days,
      _play_time: settings.play_time,
    });

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
