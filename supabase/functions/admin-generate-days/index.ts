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
    // Get auth token to verify admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Create clients - one with auth user token and one with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    // Create client with user token to verify admin permissions
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify admin status
    const { data: userData, error: userError } =
      await userClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Authentication error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { data: profile, error: profileError } = await userClient
      .from("profiles")
      .select("is_admin")
      .eq("id", userData.user.id)
      .single();

    if (profileError || !profile || !profile.is_admin) {
      return new Response(
        JSON.stringify({ error: "Admin privileges required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        }
      );
    }

    // Get request parameters
    const { year, month } = await req.json();
    if (!year || !month) {
      return new Response(
        JSON.stringify({ error: "Missing year or month parameter" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Create client with service role for database operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Call the RPC function to generate days
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
        JSON.stringify({ error: "Failed to generate days", details: rpcError }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Auto-add core members to the newly created days
    await addCoreMembersToNewDays(adminClient, days);

    return new Response(JSON.stringify({ success: true, days }), {
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
  if (!days || days.length === 0) return;

  try {
    // Get all core members
    const { data: coreMembers, error: coreError } = await supabase
      .from("core_members")
      .select("user_id");

    if (coreError || !coreMembers.length) {
      console.error("Error fetching core members:", coreError);
      return;
    }

    // For each day, add all core members who haven't opted out
    for (const day of days) {
      // Check for existing opt-outs
      const { data: optOuts, error: optOutError } = await supabase
        .from("core_member_opt_outs")
        .select("user_id")
        .eq("day_id", day.id);

      if (optOutError) {
        console.error(
          `Error checking opt-outs for day ${day.id}:`,
          optOutError
        );
        continue;
      }

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

      if (participants.length > 0) {
        // Insert participants in batches to avoid payload size issues
        const batchSize = 10;
        for (let i = 0; i < participants.length; i += batchSize) {
          const batch = participants.slice(i, i + batchSize);
          const { error: insertError } = await supabase
            .from("badminton_participants")
            .upsert(batch, { onConflict: "user_id,day_id" });

          if (insertError) {
            console.error(
              `Error adding core members to day ${day.id}:`,
              insertError
            );
          }
        }
      }
    }
  } catch (error) {
    console.error("Error adding core members:", error);
  }
}
