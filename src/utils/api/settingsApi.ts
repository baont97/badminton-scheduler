import { supabase } from "@/integrations/supabase/client";
import { generateBadmintonDays } from "@/utils/api/dayApi";

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
}) {
  try {
    const { data, error } = await supabase
      .from("badminton_settings")
      .update({
        session_price: settings.session_price,
        max_members: settings.max_members,
      })
      .eq("id", "00000000-0000-0000-0000-000000000000");

    if (error) {
      console.error("Error details:", error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error("Error updating badminton settings:", error);
    return false;
  }
}

// Fetch all locations
export async function fetchLocations() {
  try {
    const { data, error } = await supabase
      .from("badminton_locations")
      .select("*")
      .order("name");

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Error fetching locations:", error);
    return [];
  }
}

// Create a new location
export async function createLocation(location: {
  name: string;
  address?: string;
}) {
  try {
    const { data, error } = await supabase
      .from("badminton_locations")
      .insert(location)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Error creating location:", error);
    return null;
  }
}

// Update a location
export async function updateLocation(
  id: string,
  location: { name: string; address?: string }
) {
  try {
    const { error } = await supabase
      .from("badminton_locations")
      .update(location)
      .eq("id", id);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error("Error updating location:", error);
    return false;
  }
}

// Delete a location
export async function deleteLocation(id: string) {
  try {
    const { error } = await supabase
      .from("badminton_locations")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error("Error deleting location:", error);
    return false;
  }
}

// Fetch day settings
export async function fetchDaySettings() {
  try {
    const { data, error } = await supabase
      .from("day_settings")
      .select(`
        *,
        location:location_id (
          id,
          name,
          address
        )
      `)
      .order("day_of_week");

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Error fetching day settings:", error);
    return [];
  }
}

// Create or update a day setting
export async function upsertDaySetting(daySetting: {
  id?: string;
  day_of_week: number;
  play_time: string;
  court_count: number;
  location_id: string | null;
  is_active: boolean;
}) {
  try {
    // If id is provided, update; otherwise, insert
    const operation = daySetting.id
      ? supabase
          .from("day_settings")
          .update({
            play_time: daySetting.play_time,
            court_count: daySetting.court_count,
            location_id: daySetting.location_id,
            is_active: daySetting.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", daySetting.id)
      : supabase.from("day_settings").insert({
          day_of_week: daySetting.day_of_week,
          play_time: daySetting.play_time,
          court_count: daySetting.court_count,
          location_id: daySetting.location_id,
          is_active: daySetting.is_active,
        });

    const { data, error } = await operation.select().single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Error upserting day setting:", error);
    return null;
  }
}

// Delete a day setting
export async function deleteDaySetting(id: string) {
  try {
    const { error } = await supabase
      .from("day_settings")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error("Error deleting day setting:", error);
    return false;
  }
}

// Helper function to regenerate current month days
export async function regenerateCurrentMonthDays() {
  const date = new Date();
  return generateBadmintonDays(date.getFullYear(), date.getMonth() + 1);
}
