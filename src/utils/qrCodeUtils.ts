// utils/qrCodeUtils.ts
import { supabase } from "@/integrations/supabase/client";

export interface PaymentImageResponse {
  imageUrl: string;
}

/**
 * Get QR code URL from Edge Function
 */
export const getPaymentQRCode = async (): Promise<string | null> => {
  try {
    const { data, error } =
      await supabase.functions.invoke<PaymentImageResponse>(
        "get-payment-image"
      );

    if (error) {
      console.error("Error calling get-payment-image function:", error);
      return null;
    }

    if (data?.imageUrl) {
      console.log("QR Code URL from edge function:", data.imageUrl);
      return data.imageUrl;
    }

    return null;
  } catch (error) {
    console.error("Error in getPaymentQRCode:", error);
    return null;
  }
};

/**
 * Validate if image URL is accessible
 */
export const validateImageUrl = async (url: string): Promise<boolean> => {
  console.log(url);
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch (error) {
    console.error("Error validating image URL:", error);
    return false;
  }
};
