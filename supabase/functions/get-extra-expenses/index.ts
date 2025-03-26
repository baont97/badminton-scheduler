
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.4.0'

// Define types
interface ExpenseData {
  id: string;
  day_id: string;
  user_id: string;
  user_name: string;
  amount: number;
  description: string | null;
  created_at: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get request body
    const { day_id } = await req.json()

    if (!day_id) {
      return new Response(
        JSON.stringify({ error: 'Missing day_id parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Query the database directly with a SQL query since we can't use RPC functions in Edge Functions
    const { data, error } = await supabase
      .from('extra_expenses')
      .select(`
        id,
        day_id,
        user_id,
        amount,
        description,
        created_at,
        profiles:user_id (user_name)
      `)
      .eq('day_id', day_id)

    if (error) {
      console.error('Error fetching expenses:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Format the data to match our expected structure
    const formattedData = data.map((expense: any) => ({
      id: expense.id,
      day_id: expense.day_id,
      user_id: expense.user_id,
      user_name: expense.profiles?.user_name || 'Unknown User',
      amount: expense.amount,
      description: expense.description,
      created_at: expense.created_at
    }))

    return new Response(
      JSON.stringify(formattedData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
