// supabase/functions/momo-payment/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import * as crypto from "https://deno.land/std@0.170.0/node/crypto.ts";

// MoMo API configuration
const CONFIG = {
  // Replace with your actual MoMo API credentials
  PARTNER_CODE: "MOMOTBOI20250416_TEST", // Your MoMo Partner Code
  ACCESS_KEY: "fWl4OLA6qmtXCa0s", // Your MoMo Access Key
  SECRET_KEY: "rRr3x4AKtBaxvj4rEhWRWhbVVFbRsOvL", // Your MoMo Secret Key
  API_ENDPOINT: "https://test-payment.momo.vn/v2/gateway/api/create", // Use the production URL for production
  IPN_URL: "https://ealcbtnmofspramewvsl.functions.supabase.co/momo-payment", // Your IPN URL
  REDIRECT_URL: "https://badminton-app.vercel.app/payment-result", // Frontend URL to redirect after payment
};

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
    // Initialize Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request URL to determine the endpoint
    const url = new URL(req.url);
    const pathSegments = url.pathname.split("/").filter(Boolean);
    const endpoint = pathSegments[pathSegments.length - 1];

    // Route based on endpoint
    if (endpoint === "initiate") {
      // Handle payment initiation
      return await handleInitiatePayment(req, supabase);
    } else {
      // Handle IPN callback
      return await handleIpnCallback(req, supabase);
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// Function to initiate MoMo payment
async function handleInitiatePayment(req: Request, supabase: any) {
  try {
    // Parse request body
    const {
      dayId,
      userId,
      amount,
      orderInfo = "Payment for badminton session",
    } = await req.json();

    // Validate input data
    if (!dayId || !userId || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Verify the user exists
    const { data: userData, error: userError } = await supabase
      .from("profiles")
      .select("user_name")
      .eq("id", userId)
      .single();

    if (userError || !userData) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Generate unique order ID
    const orderId = `BDMNTN_${dayId.substring(0, 8)}_${userId.substring(
      0,
      8
    )}_${Date.now()}`;
    const requestId = crypto.randomUUID();

    // Create MoMo payment request
    const requestData = {
      partnerCode: CONFIG.PARTNER_CODE,
      partnerName: "Badminton Payment",
      storeId: "BadmintonStoreID",
      requestId: requestId,
      amount: amount,
      orderId: orderId,
      orderInfo: orderInfo,
      redirectUrl: CONFIG.REDIRECT_URL,
      ipnUrl: CONFIG.IPN_URL,
      lang: "vi",
      extraData: Buffer.from(
        JSON.stringify({
          dayId,
          userId,
          timestamp: Date.now(),
        })
      ).toString("base64"),
      requestType: "captureWallet",
      autoCapture: true,
    };

    // Generate signature
    const rawSignature = `accessKey=${CONFIG.ACCESS_KEY}&amount=${requestData.amount}&extraData=${requestData.extraData}&ipnUrl=${requestData.ipnUrl}&orderId=${requestData.orderId}&orderInfo=${requestData.orderInfo}&partnerCode=${requestData.partnerCode}&redirectUrl=${requestData.redirectUrl}&requestId=${requestData.requestId}&requestType=${requestData.requestType}`;
    const signature = crypto
      .createHmac("sha256", CONFIG.SECRET_KEY)
      .update(rawSignature)
      .digest("hex");

    requestData.signature = signature;

    // Call MoMo API
    const response = await fetch(CONFIG.API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    });

    // Get MoMo response
    const responseData = await response.json();

    // Store payment request in Supabase
    await supabase.from("payment_transactions").insert({
      order_id: orderId,
      request_id: requestId,
      day_id: dayId,
      user_id: userId,
      amount: amount,
      status: "pending",
      payment_data: responseData,
    });

    // Return response to client
    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error initiating payment:", error);
    return new Response(
      JSON.stringify({ error: "Failed to initiate payment" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
}

// Function to handle IPN callback
async function handleIpnCallback(req: Request, supabase: any) {
  try {
    // Parse request body
    const callbackData = await req.json();
    console.log("Received IPN callback:", callbackData);

    // Validate the callback signature
    if (!validateSignature(callbackData)) {
      console.error("Invalid signature in IPN callback");
      return new Response(JSON.stringify({ message: "Invalid signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Extract data from the callback
    const { orderId, requestId, resultCode, amount, extraData } = callbackData;

    // Check if payment was successful
    if (resultCode !== 0) {
      console.log(`Payment failed with result code: ${resultCode}`);

      // Update transaction status
      await supabase
        .from("payment_transactions")
        .update({ status: "failed", response_data: callbackData })
        .eq("order_id", orderId)
        .eq("request_id", requestId);

      return new Response(JSON.stringify({ message: "Payment failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Decode extra data
    let decodedData;
    try {
      const decodedString = atob(extraData);
      decodedData = JSON.parse(decodedString);
    } catch (error) {
      console.error("Error decoding extra data:", error);
      return new Response(JSON.stringify({ message: "Invalid extraData" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { dayId, userId } = decodedData;

    // Validate the extracted data
    if (!dayId || !userId) {
      console.error("Missing dayId or userId in extraData");
      return new Response(JSON.stringify({ message: "Invalid payment data" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Update payment transaction
    await supabase
      .from("payment_transactions")
      .update({
        status: "completed",
        response_data: callbackData,
        completed_at: new Date().toISOString(),
      })
      .eq("order_id", orderId)
      .eq("request_id", requestId);

    // Update badminton_participants has_paid status
    const { error: updateError } = await supabase
      .from("badminton_participants")
      .update({ has_paid: true })
      .eq("day_id", dayId)
      .eq("user_id", userId);

    if (updateError) {
      console.error("Error updating badminton_participants:", updateError);
      return new Response(
        JSON.stringify({ message: "Error updating payment status" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Return success response to MoMo
    return new Response(
      JSON.stringify({ message: "Payment processed successfully" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error processing IPN callback:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process payment callback" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
}

// Helper function to validate MoMo signature in callback
function validateSignature(callbackData: any): boolean {
  try {
    const { signature, ...dataWithoutSignature } = callbackData;

    // Sort keys alphabetically
    const sortedKeys = Object.keys(dataWithoutSignature).sort();

    // Build raw signature string
    let rawSignature = "";
    for (const key of sortedKeys) {
      if (
        dataWithoutSignature[key] !== null &&
        dataWithoutSignature[key] !== undefined
      ) {
        rawSignature += `&${key}=${dataWithoutSignature[key]}`;
      }
    }

    // Remove leading '&' if present
    if (rawSignature.startsWith("&")) {
      rawSignature = rawSignature.substring(1);
    }

    // Generate signature
    const calculatedSignature = crypto
      .createHmac("sha256", CONFIG.SECRET_KEY)
      .update(rawSignature)
      .digest("hex");

    return calculatedSignature === signature;
  } catch (error) {
    console.error("Error validating signature:", error);
    return false;
  }
}
