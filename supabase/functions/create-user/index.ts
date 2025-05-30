
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const servicRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    // Create Supabase client with the service role key
    const supabaseAdmin = createClient(supabaseUrl, servicRoleKey);
    
    // Parse request body
    const body = await req.json();
    console.log("Request body:", body);
    
    // Extract all possible parameter names to handle both variations
    const email = body.email;
    const password = body.password;
    const userName = body.userName || body.fullName; // Handle both parameter names

    // Validate input
    if (!email || !password || !userName) {
      console.log("Validation failed:", { email, password, userName: userName ? "[provided]" : "[missing]" });
      return new Response(
        JSON.stringify({ error: "Email, password, and userName are required", body }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Get the calling user
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: req.headers.get("Authorization") || "",
        },
      },
    });

    const {
      data: { user: callingUser },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !callingUser) {
      console.log("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Check if the calling user is an admin
    const { data: adminData, error: adminCheckError } = await supabaseClient
      .from("profiles")
      .select("is_admin")
      .eq("id", callingUser.id)
      .single();

    if (adminCheckError || !adminData.is_admin) {
      console.log("Admin check error:", adminCheckError || "User is not admin");
      return new Response(
        JSON.stringify({ error: "Only admins can create new users" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // Create new user with email confirmation set to true (no email verification)
    console.log("Creating user with:", { email, userName });
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email verification
      user_metadata: {
        user_name: userName,
      },
    });

    if (error) {
      console.log("Error creating user:", error);
      throw error;
    }

    console.log("User created successfully:", data.user.id);
    return new Response(
      JSON.stringify({ success: true, user: data.user }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error creating user:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
