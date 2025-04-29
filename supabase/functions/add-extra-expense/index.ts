
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
    const { day_id, user_id, amount, description } = await req.json()

    // Validate parameters
    if (!day_id || !user_id || !amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Insert the expense
    const { error } = await supabase
      .from('extra_expenses')
      .insert({
        day_id,
        user_id,
        amount,
        description,
      })

    if (error) {
      console.error('Error adding expense:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // After adding the expense, check if the user who added it should be automatically marked as paid
    await updatePaymentStatusForExpenseUser(supabase, day_id, user_id)

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
