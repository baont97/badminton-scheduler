
import { supabase } from "@/integrations/supabase/client";

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
