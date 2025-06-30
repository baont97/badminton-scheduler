
// supabase/functions/admin-generate-days/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    console.log("=== ADMIN GENERATE DAYS FUNCTION STARTED ===");
    
    // Get auth token to verify admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("Missing auth token");
      return new Response(JSON.stringify({ error: "Missing auth token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Create clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    console.log("Creating user client for auth verification...");
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify admin status
    const { data: userData, error: userError } =
      await userClient.auth.getUser();
    if (userError || !userData.user) {
      console.log("Authentication error:", userError);
      return new Response(JSON.stringify({ error: "Authentication error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    console.log("User authenticated:", userData.user.id);

    const { data: profile, error: profileError } = await userClient
      .from("profiles")
      .select("is_admin")
      .eq("id", userData.user.id)
      .single();

    if (profileError || !profile || !profile.is_admin) {
      console.log("Admin check failed:", profileError, profile);
      return new Response(
        JSON.stringify({ error: "Admin privileges required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        }
      );
    }

    console.log("Admin verified successfully");

    // Get request parameters
    const { year, month } = await req.json();
    if (!year || !month) {
      console.log("Missing parameters:", { year, month });
      return new Response(
        JSON.stringify({ error: "Missing year or month parameter" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    console.log(`Generating days for ${year}-${month}`);

    // Create admin client
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check day settings first
    console.log("Checking day settings...");
    const { data: daySettings, error: daySettingsError } = await adminClient
      .from("day_settings")
      .select("*")
      .eq("is_active", true);

    if (daySettingsError) {
      console.error("Error fetching day settings:", daySettingsError);
    } else {
      console.log("Active day settings:", daySettings);
    }

    // Call the RPC function to generate days
    console.log("Calling generate_badminton_days RPC...");
    const { data: days, error: rpcError } = await adminClient.rpc(
      "generate_badminton_days",
      {
        _year: year,
        _month: month,
      }
    );

    if (rpcError) {
      console.error("RPC error:", rpcError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to generate days", 
          details: rpcError,
          daySettings: daySettings 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    console.log(`Generated ${days?.length || 0} days:`, days);

    // Auto-add core members to the newly created days
    const coreMememberResults = await addCoreMembersToNewDays(adminClient, days);
    console.log("Core member addition results:", coreMememberResults);

    return new Response(JSON.stringify({ 
      success: true, 
      days: days || [],
      daySettings: daySettings,
      coreMememberResults: coreMememberResults,
      totalDaysGenerated: days?.length || 0
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error generating days:", error);
    return new Response(
      JSON.stringify({ error: "Server error", details: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

// Function to auto-add core members to new days
async function addCoreMembersToNewDays(supabase, days) {
  if (!days || days.length === 0) {
    console.log("No days to add core members to");
    return { message: "No days provided" };
  }

  try {
    console.log("Fetching core members...");
    // Get all core members
    const { data: coreMembers, error: coreError } = await supabase
      .from("core_members")
      .select("user_id");

    if (coreError) {
      console.error("Error fetching core members:", coreError);
      return { error: "Failed to fetch core members", details: coreError };
    }

    console.log(`Found ${coreMembers?.length || 0} core members:`, coreMembers);

    if (!coreMembers || coreMembers.length === 0) {
      return { message: "No core members found" };
    }

    const results = [];

    // For each day, add all core members who haven't opted out
    for (const day of days) {
      console.log(`Processing day ${day.id} (${day.date})`);
      
      // Check for existing opt-outs
      const { data: optOuts, error: optOutError } = await supabase
        .from("core_member_opt_outs")
        .select("user_id")
        .eq("day_id", day.id);

      if (optOutError) {
        console.error(`Error checking opt-outs for day ${day.id}:`, optOutError);
        results.push({ dayId: day.id, error: "Failed to check opt-outs" });
        continue;
      }

      console.log(`Found ${optOuts?.length || 0} opt-outs for day ${day.id}`);

      // Create a set of opted-out user IDs for quick lookup
      const optedOutUsers = new Set(optOuts?.map((opt) => opt.user_id) || []);

      // Prepare participants to insert
      const participants = coreMembers
        .filter((member) => !optedOutUsers.has(member.user_id))
        .map((member) => ({
          user_id: member.user_id,
          day_id: day.id,
          has_paid: false,
          slot: 1,
          created_at: new Date().toISOString(),
        }));

      console.log(`Adding ${participants.length} participants to day ${day.id}`);

      if (participants.length > 0) {
        // Insert participants in batches to avoid payload size issues
        const batchSize = 10;
        for (let i = 0; i < participants.length; i += batchSize) {
          const batch = participants.slice(i, i + batchSize);
          const { error: insertError } = await supabase
            .from("badminton_participants")
            .upsert(batch, { onConflict: "user_id,day_id" });

          if (insertError) {
            console.error(`Error adding core members to day ${day.id}:`, insertError);
            results.push({ 
              dayId: day.id, 
              error: "Failed to add participants", 
              details: insertError 
            });
            break;
          }
        }
        
        if (!results.find(r => r.dayId === day.id && r.error)) {
          results.push({ 
            dayId: day.id, 
            success: true, 
            participantsAdded: participants.length 
          });
        }
      } else {
        results.push({ 
          dayId: day.id, 
          message: "No participants to add (all opted out)" 
        });
      }
    }

    console.log("Core member addition completed:", results);
    return results;
  } catch (error) {
    console.error("Error adding core members:", error);
    return { error: "Exception in addCoreMembersToNewDays", details: error.message };
  }
}
