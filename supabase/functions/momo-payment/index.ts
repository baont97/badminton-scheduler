// supabase/functions/momo-payment/index.ts
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
    const url = new URL(req.url);
    const path = url.pathname.split("/").pop(); // Get the last part of the path

    if (req.method === "POST") {
      // Route based on the path
      if (!path || path === "create-payment") {
        return await handleCreatePayment(req);
      } else if (path === "check-payment-status") {
        return await handleCheckPaymentStatus(req);
      }
    }

    return new Response(JSON.stringify({ error: "Unsupported route" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 404,
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

/**
 * Handle creating a new Momo payment
 */
async function handleCreatePayment(req: Request): Promise<Response> {
  try {
    // Parse request body
    const {
      amount,
      orderId,
      orderInfo,
      redirectUrl,
      extraData,
      userInfo,
      items,
      dayId,
      // Không lấy userId từ request nữa
    } = await req.json();

    // Validate required parameters
    if (!amount || !orderId || !orderInfo || !redirectUrl || !dayId) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Xác thực và lấy userId từ token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Authentication required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Lấy thông tin người dùng từ token
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid token" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // Lấy userId từ user object
    const userId = user.id;

    // Kiểm tra xem người dùng có tham gia sự kiện này không
    const { data: participant, error: participantError } = await supabase
      .from("badminton_participants")
      .select("id, has_paid")
      .eq("user_id", userId)
      .eq("day_id", dayId)
      .single();

    if (participantError) {
      return new Response(
        JSON.stringify({ error: "User is not a participant for this event" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Kiểm tra xem người dùng đã thanh toán chưa
    if (participant.has_paid) {
      return new Response(
        JSON.stringify({ error: "User has already paid for this event" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Cấu hình MoMo
    const momoConfig = {
      partnerCode: Deno.env.get("MOMO_PARTNER_CODE") || "",
      accessKey: Deno.env.get("MOMO_ACCESS_KEY") || "",
      secretKey: Deno.env.get("MOMO_SECRET_KEY") || "",
      endpoint:
        Deno.env.get("MOMO_ENDPOINT") ||
        "https://test-payment.momo.vn/v2/gateway/api/create",
    };

    if (
      !momoConfig.partnerCode ||
      !momoConfig.accessKey ||
      !momoConfig.secretKey
    ) {
      console.error("Missing Momo configuration");
      return new Response(
        JSON.stringify({ error: "Payment service is not properly configured" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Create requestId
    const requestId = crypto.randomUUID();

    // Store userId and dayId in extraData
    const customExtraData = JSON.stringify({
      userId: userId,
      dayId: dayId,
      customData: extraData ? JSON.parse(extraData) : {},
    });

    // Base64 encode extraData
    const encodedExtraData = btoa(customExtraData);

    // Prepare request data for Momo
    const requestData = {
      partnerCode: momoConfig.partnerCode,
      accessKey: momoConfig.accessKey,
      requestId: requestId,
      amount: amount.toString(),
      orderId: orderId,
      orderInfo: orderInfo,
      redirectUrl: redirectUrl,
      ipnUrl: "https://ealcbtnmofspramewvsl.supabase.co/functions/v1/momo-ipn",
      extraData: encodedExtraData,
      requestType: "captureWallet",
    };

    // Add optional fields if provided
    if (userInfo) {
      // @ts-ignore - Adding optional field
      requestData.userInfo = userInfo;
    }

    if (items && items.length > 0) {
      // @ts-ignore - Adding optional field
      requestData.items = items;
    }

    // Create signature
    const rawSignature = Object.keys(requestData)
      .sort()
      .map((key) => `${key}=${requestData[key as keyof typeof requestData]}`)
      .join("&");

    const signature = await createHmacSignature(
      rawSignature,
      momoConfig.secretKey
    );

    // Add signature to request
    const paymentRequest = {
      ...requestData,
      signature: signature,
      lang: "vi",
    };

    console.log("Sending request to Momo:", {
      requestId: requestId,
      orderId: orderId,
      userId: userId,
    });

    // Send request to Momo
    const response = await fetch(momoConfig.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentRequest),
    });

    const responseData = await response.json();

    // Log response
    console.log("Momo response received:", {
      resultCode: responseData.resultCode,
      orderId: orderId,
    });

    // Đảm bảo amount là số nguyên
    const parsedAmount = Math.round(Number(amount));

    // Save transaction
    const { error: transactionError } = await supabase
      .from("momo_transactions")
      .insert({
        partner_code: momoConfig.partnerCode,
        request_id: requestId,
        order_id: orderId,
        amount: parsedAmount,
        signature: signature,
        badminton_participant_id: participant.id,
      });

    if (transactionError) {
      console.error("Error saving transaction", transactionError);
    }

    // Return payment URL
    return new Response(
      JSON.stringify({
        success: responseData.resultCode === 0,
        message: responseData.message || "Unknown error",
        payUrl: responseData.payUrl,
        orderId: orderId,
        requestId: requestId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: responseData.resultCode === 0 ? 200 : 400,
      }
    );
  } catch (error) {
    console.error("Error creating payment:", error);
    return new Response(
      JSON.stringify({
        error: "Error creating payment",
        message: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
}

/**
 * Handle checking the status of a Momo payment
 */
async function handleCheckPaymentStatus(req: Request): Promise<Response> {
  try {
    // Xác thực người dùng
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const { orderId } = await req.json();
    if (!orderId) {
      return new Response(JSON.stringify({ error: "Missing orderId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Khởi tạo Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Lấy thông tin người dùng từ token
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Lấy thông tin giao dịch
    const { data: transaction, error: txError } = await supabase
      .from("momo_transactions")
      .select(
        `
        order_id, 
        is_processed, 
        is_verified, 
        payment_status,
        badminton_participant_id,
        badminton_participants:badminton_participant_id(user_id, day_id, has_paid)
      `
      )
      .eq("order_id", orderId)
      .single();

    if (txError) {
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Kiểm tra transaction thuộc về người dùng hiện tại
    if (transaction.badminton_participants?.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Access denied to this transaction" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Nếu giao dịch chưa được xử lý hoàn tất, kiểm tra với MoMo
    if (!transaction.is_processed) {
      // Kiểm tra với MoMo API
      const momoConfig = {
        partnerCode: Deno.env.get("MOMO_PARTNER_CODE") || "",
        secretKey: Deno.env.get("MOMO_SECRET_KEY") || "",
        verifyEndpoint:
          Deno.env.get("MOMO_VERIFY_ENDPOINT") ||
          "https://test-payment.momo.vn/v2/gateway/api/query",
      };

      // Tạo requestId mới để kiểm tra
      const verifyRequestId = crypto.randomUUID();

      // Chuẩn bị request kiểm tra
      const verifyRequest = {
        partnerCode: momoConfig.partnerCode,
        requestId: verifyRequestId,
        orderId: orderId,
        lang: "vi",
      };

      // Tạo chữ ký
      const rawSignature = Object.keys(verifyRequest)
        .sort()
        .map(
          (key) => `${key}=${verifyRequest[key as keyof typeof verifyRequest]}`
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
          ...verifyRequest,
          signature: signature,
        }),
      });

      const momoResponseData = await momoResponse.json();

      // Kiểm tra kết quả
      const isPaymentSuccessful =
        momoResponseData.resultCode === 0 && momoResponseData.status === 0;

      if (isPaymentSuccessful) {
        // Cập nhật momo_transactions
        await supabase
          .from("momo_transactions")
          .update({
            is_processed: true,
            is_verified: true,
            payment_status: "Success", // Ghi rõ trạng thái thành "Success"
            processed_at: new Date().toISOString(),
          })
          .eq("order_id", orderId);

        // Cập nhật badminton_participants
        await supabase
          .from("badminton_participants")
          .update({ has_paid: true })
          .eq("id", transaction.badminton_participant_id);

        // Cập nhật thông tin để trả về
        transaction.is_processed = true;
        transaction.is_verified = true;
        transaction.payment_status = momoResponseData.transactionStatus;
        transaction.badminton_participants.has_paid = true;
      } else if (momoResponseData.status === 2) {
        // 1006 = đang xử lý
        // Giao dịch thất bại
        await supabase
          .from("momo_transactions")
          .update({
            is_processed: true,
            is_verified: false,
            payment_status: "Failed",
            processed_at: new Date().toISOString(),
          })
          .eq("order_id", orderId);

        // Cập nhật thông tin để trả về
        transaction.is_processed = true;
        transaction.is_verified = false;
        transaction.payment_status =
          momoResponseData.transactionStatus || "Failed";
      }
    }

    // Trả về trạng thái giao dịch
    return new Response(
      JSON.stringify({
        orderId: transaction.order_id,
        status: transaction.payment_status,
        isVerified: transaction.is_verified,
        isProcessed: transaction.is_processed,
        participantHasPaid:
          transaction.badminton_participants?.has_paid || false,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error checking payment status:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

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
