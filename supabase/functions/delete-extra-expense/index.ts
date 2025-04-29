
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

    // Get the user_id and day_id of the expense
    const { data: expenseData, error: fetchError } = await supabase
      .from('extra_expenses')
      .select('user_id, day_id')
      .eq('id', expense_id)
      .single()

    if (fetchError) {
      console.error('Error fetching expense:', fetchError)
      
      // If the expense doesn't exist, consider it successfully deleted
      if (fetchError.code === 'PGRST116') {
        return new Response(
          JSON.stringify(true),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }
      
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Store user_id and day_id to update payment status later
    const userId = expenseData.user_id
    const dayId = expenseData.day_id

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

    // Check if the current user is the owner of the expense or an admin
    const { data: profileData } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userData.user.id)
      .single()
    
    const isAdmin = profileData?.is_admin === true
    
    if (!isAdmin && userData.user.id !== userId) {
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

    console.log(`Expense ${expense_id} successfully deleted by user ${userData.user.id}`)
    
    // Update the payment status for the expense owner after deletion
    await updatePaymentStatusForExpenseUser(supabase, dayId, userId)

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

// Function to update payment status based on user's expenses and share
async function updatePaymentStatusForExpenseUser(supabase, dayId, userId) {
  try {
    // Get all participants for the day to calculate shares
    const { data: participants, error: participantsError } = await supabase
      .from('badminton_participants')
      .select('user_id, slot')
      .eq('day_id', dayId)

    if (participantsError) {
      console.error('Error fetching participants:', participantsError)
      return
    }

    // Get day details for session cost
    const { data: dayData, error: dayError } = await supabase
      .from('badminton_days')
      .select('session_cost')
      .eq('id', dayId)
      .single()

    if (dayError || !dayData) {
      console.error('Error fetching day data:', dayError)
      return
    }

    // Get all expenses for the day
    const { data: expenses, error: expensesError } = await supabase
      .from('extra_expenses')
      .select('user_id, amount')
      .eq('day_id', dayId)

    if (expensesError) {
      console.error('Error fetching expenses:', expensesError)
      return
    }

    // Calculate total user slots
    const totalSlots = participants.reduce((sum, p) => sum + (p.slot || 1), 0)
    if (totalSlots === 0) return

    // Calculate cost per person (session cost + all expenses)
    const totalSessionCost = dayData.session_cost
    const totalExtraCost = expenses.reduce((sum, expense) => sum + expense.amount, 0)
    const costPerSlot = (totalSessionCost + totalExtraCost) / totalSlots

    // Calculate the user's slot count
    const userParticipant = participants.find(p => p.user_id === userId)
    if (!userParticipant) return

    const userSlotCount = userParticipant.slot || 1
    const userTotalCost = costPerSlot * userSlotCount

    // Calculate total expenses added by the user
    const userExpenses = expenses
      .filter(expense => expense.user_id === userId)
      .reduce((sum, expense) => sum + expense.amount, 0)

    // Check if user's expenses cover or exceed their share
    const shouldMarkAsPaid = userExpenses >= userTotalCost

    if (shouldMarkAsPaid) {
      // Update participant's payment status to paid
      await supabase
        .from('badminton_participants')
        .update({ has_paid: true })
        .eq('day_id', dayId)
        .eq('user_id', userId)
    } else {
      // If user was previously marked as paid because of expenses but no longer meets the criteria
      await supabase
        .from('badminton_participants')
        .update({ has_paid: false })
        .eq('day_id', dayId)
        .eq('user_id', userId)
    }
  } catch (error) {
    console.error('Error updating payment status:', error)
  }
}
