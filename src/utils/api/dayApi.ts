
import { supabase } from "@/integrations/supabase/client";
import { CalendarDay } from "../schedulerUtils";
import { fetchDayParticipants } from "./participantApi";
import { fetchExtraExpenses } from "./expenseApi";

// Generate badminton days for a specific month
export async function generateBadmintonDays(year: number, month: number) {
  try {
    // First, fetch existing days to preserve their status
    const { data: existingDays, error: fetchError } = await supabase
      .from("badminton_days")
      .select("*")
      .gte("date", `${year}-${month.toString().padStart(2, "0")}-01`)
      .lt("date", `${year}-${(month + 1).toString().padStart(2, "0")}-01`);

    if (fetchError) throw fetchError;

    // Create a map of existing days by date
    const existingDaysMap = new Map(
      existingDays?.map((day) => [day.date, day]) || []
    );

    // Generate new days
    const { data, error } = await supabase.rpc("generate_badminton_days", {
      _year: year,
      _month: month,
    });

    if (error) throw error;

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

    if (updateError) throw updateError;

    return updatedDays;
  } catch (error) {
    console.error("Error generating badminton days:", error);
    return [];
  }
}

// Fetch badminton days for a specific month
export async function fetchBadmintonDays(
  year: number,
  month: number
): Promise<CalendarDay[]> {
  try {
    // Fetch the days
    const { data, error } = await supabase
      .from("badminton_days")
      .select("*")
      .gte("date", `${year}-${month.toString().padStart(2, "0")}-01`)
      .lt("date", `${year}-${(month + 1).toString().padStart(2, "0")}-01`);

    if (error) throw error;

    // If no days exist, return empty array
    if (!data || data.length === 0) {
      return [];
    }

    // Fetch all opt-outs for this month's days
    const dayIds = data.map((day) => day.id);
    const { data: optOuts, error: optOutsError } = await supabase
      .from("core_member_opt_outs")
      .select("day_id, user_id")
      .in("day_id", dayIds);

    if (optOutsError) console.error("Error fetching opt-outs:", optOutsError);

    // Group opt-outs by day_id
    const optOutsByDay = {};
    if (optOuts) {
      optOuts.forEach((opt) => {
        if (!optOutsByDay[opt.day_id]) optOutsByDay[opt.day_id] = [];
        optOutsByDay[opt.day_id].push(opt.user_id);
      });
    }

    // Convert to CalendarDay format
    const calendarDays: CalendarDay[] = await Promise.all(
      data.map(async (day) => {
        const participants = await fetchDayParticipants(day.id);
        const expenses = await fetchExtraExpenses(day.id);

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
