
import { supabase } from "@/integrations/supabase/client";

// Fetch participants for a specific day
export async function fetchDayParticipants(
  dayId: string
): Promise<{ userId: string; hasPaid: boolean; slot: number }[]> {
  try {
    const { data, error } = await supabase
      .from("badminton_participants")
      .select("user_id, has_paid, slot")
      .eq("day_id", dayId);

    if (error) throw error;

    return data.map((participant) => ({
      userId: participant.user_id,
      hasPaid: participant.has_paid || false,
      slot: participant.slot,
    }));
  } catch (error) {
    console.error("Error fetching day participants:", error);
    return [];
  }
}

// Toggle user participation in a day
export async function toggleParticipation(
  dayId: string,
  userId: string,
  isParticipating: boolean,
  slot: number
): Promise<boolean> {
  try {
    console.log("toggleParticipation called with:", {
      dayId,
      userId,
      isParticipating,
      slot,
    });

    if (isParticipating) {
      // Remove participation
      const { error } = await supabase
        .from("badminton_participants")
        .delete()
        .eq("day_id", dayId)
        .eq("user_id", userId);

      if (error) {
        console.error("Error removing participation:", error);
        return false;
      }

      // Add to opt-out list
      await supabase
        .from("core_member_opt_outs")
        .upsert({ day_id: dayId, user_id: userId });

      return true;
    } else {
      // Add participation
      console.log("Adding participation:", {
        day_id: dayId,
        user_id: userId,
        has_paid: false,
        slot,
      });

      const { error } = await supabase.from("badminton_participants").insert({
        day_id: dayId,
        user_id: userId,
        has_paid: false,
        slot,
      });

      if (error) {
        console.error("Error adding participation:", error);
        return false;
      }

      // Remove from opt-out list
      await supabase
        .from("core_member_opt_outs")
        .delete()
        .eq("day_id", dayId)
        .eq("user_id", userId);

      return true;
    }
  } catch (error) {
    console.error("Error toggling participation:", error);
    return false;
  }
}

// Mark payment status for a participant
export async function markPaymentStatus(
  dayId: string,
  userId: string,
  hasPaid: boolean
): Promise<boolean> {
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
