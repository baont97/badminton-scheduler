
// This file is used to generate SQL for database functions
console.log(`
-- Function to get extra expenses with user names
CREATE OR REPLACE FUNCTION public.get_extra_expenses(day_id_param UUID)
RETURNS TABLE (
  id UUID,
  day_id UUID,
  user_id UUID,
  user_name TEXT,
  amount INTEGER,
  description TEXT,
  created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    e.id,
    e.day_id,
    e.user_id,
    p.user_name,
    e.amount,
    e.description,
    e.created_at
  FROM 
    public.extra_expenses e
  LEFT JOIN 
    public.profiles p ON e.user_id = p.id
  WHERE 
    e.day_id = day_id_param;
END;
$$;

-- Function to add an extra expense
CREATE OR REPLACE FUNCTION public.add_extra_expense(
  day_id_param UUID,
  user_id_param UUID,
  amount_param INTEGER,
  description_param TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_slots INTEGER;
  total_session_cost INTEGER;
  total_extra_cost INTEGER;
  cost_per_slot NUMERIC;
  user_slot_count INTEGER;
  user_total_cost NUMERIC;
  user_expenses INTEGER;
BEGIN
  -- Insert the expense
  INSERT INTO public.extra_expenses (
    day_id,
    user_id,
    amount,
    description
  ) VALUES (
    day_id_param,
    user_id_param,
    amount_param,
    description_param
  );
  
  -- Calculate if the user should be marked as paid
  SELECT COALESCE(SUM(COALESCE(slot, 1)), 0) INTO total_slots
  FROM public.badminton_participants
  WHERE day_id = day_id_param::TEXT;
  
  SELECT session_cost INTO total_session_cost
  FROM public.badminton_days
  WHERE id = day_id_param;
  
  SELECT COALESCE(SUM(amount), 0) INTO total_extra_cost
  FROM public.extra_expenses
  WHERE day_id = day_id_param;
  
  -- Only proceed if there are participants
  IF total_slots > 0 THEN
    cost_per_slot := (total_session_cost + total_extra_cost)::NUMERIC / total_slots;
    
    SELECT COALESCE(slot, 1) INTO user_slot_count
    FROM public.badminton_participants
    WHERE day_id = day_id_param::TEXT AND user_id = user_id_param;
    
    IF user_slot_count IS NOT NULL THEN
      user_total_cost := cost_per_slot * user_slot_count;
      
      SELECT COALESCE(SUM(amount), 0) INTO user_expenses
      FROM public.extra_expenses
      WHERE day_id = day_id_param AND user_id = user_id_param;
      
      -- Mark as paid if user expenses exceed or equal their share
      IF user_expenses >= user_total_cost THEN
        UPDATE public.badminton_participants
        SET has_paid = TRUE
        WHERE day_id = day_id_param::TEXT AND user_id = user_id_param;
      END IF;
    END IF;
  END IF;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Function to delete an extra expense
CREATE OR REPLACE FUNCTION public.delete_extra_expense(expense_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_day_id UUID;
  total_slots INTEGER;
  total_session_cost INTEGER;
  total_extra_cost INTEGER;
  cost_per_slot NUMERIC;
  user_slot_count INTEGER;
  user_total_cost NUMERIC;
  user_expenses INTEGER;
BEGIN
  -- Get the user_id and day_id of the expense
  SELECT user_id, day_id INTO v_user_id, v_day_id 
  FROM public.extra_expenses 
  WHERE id = expense_id_param;
  
  -- Check if the current user is the owner
  IF v_user_id = auth.uid() THEN
    -- Delete the expense
    DELETE FROM public.extra_expenses WHERE id = expense_id_param;
    
    -- Recalculate payment status for the expense owner
    SELECT COALESCE(SUM(COALESCE(slot, 1)), 0) INTO total_slots
    FROM public.badminton_participants
    WHERE day_id = v_day_id::TEXT;
    
    IF total_slots > 0 THEN
      SELECT session_cost INTO total_session_cost
      FROM public.badminton_days
      WHERE id = v_day_id;
      
      SELECT COALESCE(SUM(amount), 0) INTO total_extra_cost
      FROM public.extra_expenses
      WHERE day_id = v_day_id;
      
      cost_per_slot := (total_session_cost + total_extra_cost)::NUMERIC / total_slots;
      
      SELECT COALESCE(slot, 1) INTO user_slot_count
      FROM public.badminton_participants
      WHERE day_id = v_day_id::TEXT AND user_id = v_user_id;
      
      IF user_slot_count IS NOT NULL THEN
        user_total_cost := cost_per_slot * user_slot_count;
        
        SELECT COALESCE(SUM(amount), 0) INTO user_expenses
        FROM public.extra_expenses
        WHERE day_id = v_day_id AND user_id = v_user_id;
        
        -- Update payment status based on current expenses
        UPDATE public.badminton_participants
        SET has_paid = (user_expenses >= user_total_cost)
        WHERE day_id = v_day_id::TEXT AND user_id = v_user_id;
      END IF;
    END IF;
    
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;
`);

