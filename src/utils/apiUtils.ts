import { supabase } from "@/integrations/supabase/client";
import { Member, CalendarDay } from "./schedulerUtils";

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

// Add new function to handle extra expenses
export interface ExtraExpense {
  id: string;
  dayId: string;
  userId: string;
  userName: string;
  amount: number;
  description: string;
  createdAt: string;
}

// Fetch extra expenses for a day
export async function fetchExtraExpenses(
  dayId: string
): Promise<ExtraExpense[]> {
  try {
    // Direct query instead of using the edge function
    const { data: expenses, error } = await supabase
      .from("extra_expenses")
      .select("id, day_id, user_id, amount, description, created_at")
      .eq("day_id", dayId);

    if (error) {
      console.error("Error fetching expenses:", error);
      throw error;
    }

    if (!expenses || expenses.length === 0) return [];

    // Get profiles data for user names
    const userIds = Array.from(
      new Set(expenses.map((expense) => expense.user_id))
    );
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, user_name")
      .in("id", userIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
    }

    // Create a map of user IDs to names
    const userNameMap = new Map();
    if (profiles) {
      profiles.forEach((profile) => {
        userNameMap.set(profile.id, profile.user_name || "Unknown User");
      });
    }

    // Transform the data to match our ExtraExpense interface
    return expenses.map((expense) => ({
      id: expense.id,
      dayId: expense.day_id,
      userId: expense.user_id,
      userName: userNameMap.get(expense.user_id) || "Unknown User",
      amount: expense.amount,
      description: expense.description || "",
      createdAt: expense.created_at,
    }));
  } catch (error) {
    console.error("Error fetching extra expenses:", error);
    return [];
  }
}

// Add an extra expense
export async function addExtraExpense(
  dayId: string,
  amount: number,
  description: string
): Promise<boolean> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) return false;

    // Use direct fetch with the custom function endpoint
    const { data, error } = await supabase.functions.invoke<boolean>(
      "add-extra-expense",
      {
        body: {
          day_id: dayId,
          user_id: session.session.user.id,
          amount: amount,
          description: description,
        },
      }
    );

    if (error) {
      console.error("Error adding expense:", error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error("Error adding extra expense:", error);
    return false;
  }
}

// Delete an extra expense
export async function deleteExtraExpense(expenseId: string): Promise<boolean> {
  try {
    // Use direct fetch with the custom function endpoint
    const { data, error } = await supabase.functions.invoke<boolean>(
      "delete-extra-expense",
      {
        body: { expense_id: expenseId },
      }
    );

    if (error) {
      console.error("Error deleting expense:", error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error("Error deleting extra expense:", error);
    return false;
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

// Delete a user (admin only)
export async function deleteUser(
  userId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session) {
      return {
        success: false,
        message: "Bạn cần đăng nhập để thực hiện thao tác này",
      };
    }

    const { data, error } = await supabase.functions.invoke("manage-user", {
      body: {
        action: "delete",
        userId,
      },
      headers: {
        Authorization: `Bearer ${session.session.access_token}`,
      },
    });

    if (error) {
      console.error("Error deleting user:", error);
      return {
        success: false,
        message: error.message || "Không thể xóa người dùng",
      };
    }

    return data.success
      ? { success: true, message: "Xóa người dùng thành công" }
      : { success: false, message: data.error || "Không thể xóa người dùng" };
  } catch (error) {
    console.error("Error in deleteUser:", error);
    return { success: false, message: "Đã xảy ra lỗi khi xóa người dùng" };
  }
}

// Block a user (admin only)
export async function blockUser(
  userId: string,
  isBlocked: boolean
): Promise<{ success: boolean; message: string }> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session) {
      return {
        success: false,
        message: "Bạn cần đăng nhập để thực hiện thao tác này",
      };
    }

    const action = isBlocked ? "unblock" : "block";
    const { data, error } = await supabase.functions.invoke("manage-user", {
      body: {
        action,
        userId,
      },
      headers: {
        Authorization: `Bearer ${session.session.access_token}`,
      },
    });

    if (error) {
      console.error(`Error ${action} user:`, error);
      return {
        success: false,
        message:
          error.message ||
          `Không thể ${isBlocked ? "mở khóa" : "khóa"} người dùng`,
      };
    }

    return data.success
      ? {
          success: true,
          message: `${isBlocked ? "Mở khóa" : "Khóa"} người dùng thành công`,
        }
      : {
          success: false,
          message:
            data.error ||
            `Không thể ${isBlocked ? "mở khóa" : "khóa"} người dùng`,
        };
  } catch (error) {
    console.error(
      `Error in ${isBlocked ? "unblockUser" : "blockUser"}:`,
      error
    );
    return {
      success: false,
      message: `Đã xảy ra lỗi khi ${isBlocked ? "mở khóa" : "khóa"} người dùng`,
    };
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

// Add this to your src/utils/apiUtils.ts file

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
    const { data: participants, error: participantsError } = await supabase
      .from("badminton_participants")
      .select("user_id, has_paid, slot")
      .eq("day_id", dayId);

    if (participantsError) {
      console.error("Error fetching participants:", participantsError);
      return null;
    }

    // Fetch extra expenses
    const extraExpenses = await fetchExtraExpenses(dayId);

    // Create updated CalendarDay object
    const updatedDay: CalendarDay = {
      id: dayData.id,
      date: dayData.date,
      dayOfWeek: dayData.day_of_week,
      isActive: dayData.is_active,
      members: participants.map((p) => p.user_id),
      paidMembers: participants.filter((p) => p.has_paid).map((p) => p.user_id),
      slots: participants.map((p) => [p.user_id, p.slot || 1]),
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
