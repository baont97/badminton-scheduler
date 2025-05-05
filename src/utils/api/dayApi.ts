
import { supabase } from "@/integrations/supabase/client";
import { CalendarDay } from "../schedulerUtils";
import { fetchDayParticipants } from "./participantApi";
import { fetchExtraExpenses } from "./expenseApi";

// Generate badminton days for a specific month
export async function generateBadmintonDays(year: number, month: number) {
  try {
    console.log(`Generating badminton days for ${year}-${month}`);
    
    // First, fetch existing days to preserve their status
    const { data: existingDays, error: fetchError } = await supabase
      .from("badminton_days")
      .select("*")
      .gte("date", `${year}-${month.toString().padStart(2, "0")}-01`)
      .lt("date", `${year}-${(month + 1).toString().padStart(2, "0")}-01`);

    if (fetchError) {
      console.error("Error fetching existing days:", fetchError);
      throw fetchError;
    }

    // Create a map of existing days by date
    const existingDaysMap = new Map(
      existingDays?.map((day) => [day.date, day]) || []
    );

    console.log(`Found ${existingDays?.length || 0} existing days`);

    // Generate new days
    const { data, error } = await supabase.rpc("generate_badminton_days", {
      _year: year,
      _month: month,
    });

    if (error) {
      console.error("Error calling generate_badminton_days RPC:", error);
      throw error;
    }

    console.log(`Generated ${data?.length || 0} days from RPC`);

    // For each generated day, preserve the is_active status if it exists
    const updatedDays = data.map((day: any) => {
      const existingDay = existingDaysMap.get(day.date);
      if (existingDay) {
        return {
          ...day,
          is_active: existingDay.is_active,
        };
      }
      return day;
    });

    // Update the days with preserved status
    const { error: updateError } = await supabase
      .from("badminton_days")
      .upsert(updatedDays, { onConflict: "date" });

    if (updateError) {
      console.error("Error upserting badminton days:", updateError);
      throw updateError;
    }

    console.log(`Successfully upserted ${updatedDays.length} days`);
    return updatedDays;
  } catch (error) {
    console.error("Error generating badminton days:", error);
    throw error; // Rethrow to allow proper error handling
  }
}

// Generate days for the current month
export async function generateCurrentMonthDays() {
  const date = new Date();
  return generateBadmintonDays(date.getFullYear(), date.getMonth() + 1);
}

// Fetch badminton days for a specific month
export async function fetchBadmintonDays(
  year: number,
  month: number
): Promise<CalendarDay[]> {
  try {
    // Fetch the days first
    const { data: daysData, error: daysError } = await supabase
      .from("badminton_days")
      .select("*")
      .gte("date", `${year}-${month.toString().padStart(2, "0")}-01`)
      .lt("date", `${year}-${(month + 1).toString().padStart(2, "0")}-01`);

    if (daysError) throw daysError;

    // If no days exist, return empty array
    if (!daysData || daysData.length === 0) {
      return [];
    }

    // Get settings for each day
    const dayIds = daysData.map(day => day.id);
    const dayOfWeeks = Array.from(new Set(daysData.map(day => day.day_of_week)));

    // Fetch day settings for these day_of_week values
    const { data: daySettings, error: settingsError } = await supabase
      .from("day_settings")
      .select(`
        *,
        location:location_id(id, name, address)
      `)
      .in("day_of_week", dayOfWeeks);

    if (settingsError) {
      console.error("Error fetching day settings:", settingsError);
    }

    // Create a map of day settings by day_of_week
    const daySettingsMap = new Map();
    if (daySettings) {
      daySettings.forEach(setting => {
        daySettingsMap.set(setting.day_of_week, {
          courtCount: setting.court_count || 1,
          location: setting.location
        });
      });
    }

    // Fetch all opt-outs for this month's days
    const { data: optOuts, error: optOutsError } = await supabase
      .from("core_member_opt_outs")
      .select("day_id, user_id")
      .in("day_id", dayIds);

    if (optOutsError) console.error("Error fetching opt-outs:", optOutsError);

    // Group opt-outs by day_id
    const optOutsByDay: {[key: string]: string[]} = {};
    if (optOuts) {
      optOuts.forEach((opt) => {
        if (!optOutsByDay[opt.day_id]) optOutsByDay[opt.day_id] = [];
        optOutsByDay[opt.day_id].push(opt.user_id);
      });
    }

    // Convert to CalendarDay format
    const calendarDays: CalendarDay[] = await Promise.all(
      daysData.map(async (day) => {
        const participants = await fetchDayParticipants(day.id);
        const expenses = await fetchExtraExpenses(day.id);

        // Get day settings from the map
        const settings = daySettingsMap.get(day.day_of_week);
        const location = settings?.location || null;
        const courtCount = settings?.courtCount || 1;

        return {
          id: day.id,
          date: new Date(day.date).toISOString(),
          dayOfWeek: day.day_of_week,
          isActive: day.is_active,
          members: participants.map((p) => p.userId),
          paidMembers: participants
            .filter((p) => p.hasPaid)
            .map((p) => p.userId),
          slots: participants.map((p) => [p.userId, p.slot]),
          maxMembers: day.max_members,
          sessionCost: day.session_cost,
          sessionTime: day.session_time,
          extraExpenses: expenses,
          can_pay: day.can_pay,
          _removedCoreMembers: optOutsByDay[day.id] || [],
          // Add new properties for location and court count
          location: location,
          courtCount: courtCount,
        };
      })
    );

    return calendarDays;
  } catch (error) {
    console.error("Error fetching badminton days:", error);
    return [];
  }
}

// Soft delete a badminton day
export async function deleteBadmintonDay(dayId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("badminton_days")
      .update({ is_active: false })
      .eq("id", dayId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error soft deleting badminton day:", error);
    return false;
  }
}

// Toggle day payment status
export async function toggleDayPaymentStatus(dayId: string, canPay: boolean): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('toggle_day_payment_status', {
        day_id_param: dayId,
        can_pay_param: canPay,
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error toggling day payment status:", error);
    return false;
  }
}
