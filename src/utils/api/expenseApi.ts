
import { supabase } from "@/integrations/supabase/client";

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
