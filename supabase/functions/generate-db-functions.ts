
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
BEGIN
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
BEGIN
  -- Get the user_id of the expense
  SELECT user_id INTO v_user_id FROM public.extra_expenses WHERE id = expense_id_param;
  
  -- Check if the current user is the owner
  IF v_user_id = auth.uid() THEN
    DELETE FROM public.extra_expenses WHERE id = expense_id_param;
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
