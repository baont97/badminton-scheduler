// supabase/functions/momo-ipn/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // No authentication for IPN
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405,
      });
    }

    // Parse request body
    const requestBody = await req.json();
    console.log("IPN request received:", {
      orderId: requestBody.orderId,
      resultCode: requestBody.resultCode,
    });

    // Validate request payload
    if (!requestBody.orderId || requestBody.resultCode === undefined) {
      return new Response(JSON.stringify({ error: "Invalid IPN request" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Tìm giao dịch
    const { data: transaction, error: findError } = await supabase
      .from("momo_transactions")
      .select("order_id, amount, badminton_participant_id, is_processed")
      .eq("order_id", requestBody.orderId)
      .single();

    if (findError || !transaction) {
      console.error("Transaction not found:", {
        orderId: requestBody.orderId,
        error: findError,
      });

      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Kiểm tra xem giao dịch đã được xử lý chưa
    if (transaction.is_processed) {
      return new Response(
        JSON.stringify({ message: "Transaction already processed" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Xác minh với MoMo API
    const momoConfig = {
      partnerCode: Deno.env.get("MOMO_PARTNER_CODE") || "",
      accessKey: Deno.env.get("MOMO_ACCESS_KEY") || "", // Thêm accessKey
      secretKey: Deno.env.get("MOMO_SECRET_KEY") || "",
      verifyEndpoint:
        Deno.env.get("MOMO_VERIFY_ENDPOINT") ||
        "https://test-payment.momo.vn/v2/gateway/api/query",
    };

    // Tạo request ID mới cho việc xác minh
    const verifyRequestId = crypto.randomUUID();

    // Chuẩn bị request để xác minh
    const verifyRequestBody = {
      partnerCode: momoConfig.partnerCode,
      accessKey: momoConfig.accessKey, // Thêm accessKey
      requestId: verifyRequestId,
      orderId: requestBody.orderId,
    };

    // Tạo chữ ký
    const rawSignature = Object.keys(verifyRequestBody)
      .sort()
      .map(
        (key) =>
          `${key}=${verifyRequestBody[key as keyof typeof verifyRequestBody]}`
      )
      .join("&");

    const signature = await createHmacSignature(
      rawSignature,
      momoConfig.secretKey
    );

    // Gửi request đến MoMo
    const momoResponse = await fetch(momoConfig.verifyEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...verifyRequestBody,
        signature: signature,
        lang: "vi",
      }),
    });

    const momoResponseData = await momoResponse.json();
    console.log("MoMo verification response:", {
      orderId: requestBody.orderId,
      resultCode: momoResponseData.resultCode,
      message: momoResponseData.message,
    });

    // Xác định trạng thái thanh toán
    const isPaymentSuccessful = momoResponseData.resultCode === 0;

    // Kiểm tra số tiền trong response với số tiền lưu trong DB
    if (
      isPaymentSuccessful &&
      momoResponseData.amount &&
      Number(momoResponseData.amount) !== transaction.amount
    ) {
      console.error("Amount mismatch:", {
        orderId: requestBody.orderId,
        expected: transaction.amount,
        received: momoResponseData.amount,
      });

      // Đánh dấu giao dịch lỗi do số tiền không khớp
      await supabase
        .from("momo_transactions")
        .update({
          is_processed: true,
          is_verified: false,
          payment_status: "AmountMismatch",
          processed_at: new Date().toISOString(),
        })
        .eq("order_id", requestBody.orderId);

      return new Response(
        JSON.stringify({ error: "Amount verification failed" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Cập nhật trạng thái giao dịch
    if (isPaymentSuccessful) {
      // Cập nhật momo_transactions
      await supabase
        .from("momo_transactions")
        .update({
          is_processed: true,
          is_verified: true,
          payment_status: "Success",
          momo_trans_id: momoResponseData.transId, // Lưu mã giao dịch MoMo
          processed_at: new Date().toISOString(),
        })
        .eq("order_id", requestBody.orderId);

      // Cập nhật badminton_participants
      if (transaction.badminton_participant_id) {
        await supabase
          .from("badminton_participants")
          .update({ has_paid: true })
          .eq("id", transaction.badminton_participant_id);
      }

      console.log("Payment processed successfully:", {
        orderId: requestBody.orderId,
        participantId: transaction.badminton_participant_id,
        momoTransId: momoResponseData.transId,
      });
    }

    // Trả về kết quả
    return new Response(
      JSON.stringify({
        success: isPaymentSuccessful,
        transactionStatus: momoResponseData.transactionStatus,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("IPN Verification Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

/**
 * Create HMAC SHA256 signature
 */
async function createHmacSignature(
  message: string,
  key: string
): Promise<string> {
  try {
    const keyData = new TextEncoder().encode(key);
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const messageData = new TextEncoder().encode(message);
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);

    // Convert to hex
    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch (error) {
    console.error("Error creating HMAC signature:", error);
    throw error;
  }
}
