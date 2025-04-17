
import { supabase } from "@/integrations/supabase/client";
import { CalendarDay } from "../schedulerUtils";
import { fetchDayParticipants } from "./participantApi";
import { fetchExtraExpenses } from "./expenseApi";

/**
 * Fetch payment status for a specific day and user
 */
export async function fetchUserPaymentStatus(
  dayId: string,
  userId: string
): Promise<boolean> {
  try {
    // First check badminton_participants
    const { data: participantData, error: participantError } = await supabase
      .from("badminton_participants")
      .select("has_paid")
      .eq("day_id", dayId)
      .eq("user_id", userId)
      .single();

    if (participantError) {
      console.error(
        "Error fetching participant payment status:",
        participantError
      );
      return false;
    }

    return participantData?.has_paid || false;
  } catch (error) {
    console.error("Error in fetchUserPaymentStatus:", error);
    return false;
  }
}

/**
 * Sync payments with database for a specific day
 * This is useful to refresh payment data after a MoMo payment
 */
export async function syncPaymentsForDay(
  dayId: string
): Promise<CalendarDay | null> {
  try {
    // Fetch the latest data for this day
    const { data: dayData, error: dayError } = await supabase
      .from("badminton_days")
      .select("*")
      .eq("id", dayId)
      .single();

    if (dayError || !dayData) {
      console.error("Error fetching day data:", dayError);
      return null;
    }

    // Fetch participants with payment status
    const participants = await fetchDayParticipants(dayId);

    // Fetch extra expenses
    const extraExpenses = await fetchExtraExpenses(dayId);

    // Create updated CalendarDay object
    const updatedDay: CalendarDay = {
      id: dayData.id,
      date: dayData.date,
      dayOfWeek: dayData.day_of_week,
      isActive: dayData.is_active,
      members: participants.map((p) => p.userId),
      paidMembers: participants.filter((p) => p.hasPaid).map((p) => p.userId),
      slots: participants.map((p) => [p.userId, p.slot || 1]),
      maxMembers: dayData.max_members,
      sessionCost: dayData.session_cost,
      sessionTime: dayData.session_time,
      extraExpenses: extraExpenses,
      _removedCoreMembers: [], // This might need to be fetched separately if needed
    };

    return updatedDay;
  } catch (error) {
    console.error("Error in syncPaymentsForDay:", error);
    return null;
  }
}
