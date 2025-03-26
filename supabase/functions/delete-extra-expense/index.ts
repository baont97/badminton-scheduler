
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.4.0'

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
    const { expense_id } = await req.json()

    if (!expense_id) {
      return new Response(
        JSON.stringify({ error: 'Missing expense_id parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get the user_id of the expense
    const { data: expenseData, error: fetchError } = await supabase
      .from('extra_expenses')
      .select('user_id')
      .eq('id', expense_id)
      .single()

    if (fetchError) {
      console.error('Error fetching expense:', fetchError)
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Get the JWT bearer token from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Get the current user ID from the JWT
    const token = authHeader.replace('Bearer ', '')
    const { data: userData, error: authError } = await supabase.auth.getUser(token)

    if (authError || !userData.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Check if the current user is the owner of the expense
    if (userData.user.id !== expenseData.user_id) {
      return new Response(
        JSON.stringify({ error: 'You can only delete your own expenses' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // Delete the expense
    const { error: deleteError } = await supabase
      .from('extra_expenses')
      .delete()
      .eq('id', expense_id)

    if (deleteError) {
      console.error('Error deleting expense:', deleteError)
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    return new Response(
      JSON.stringify(true),
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
