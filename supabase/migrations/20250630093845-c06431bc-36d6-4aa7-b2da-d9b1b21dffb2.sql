
-- Enable RLS on badminton_days table if not already enabled
ALTER TABLE public.badminton_days ENABLE ROW LEVEL SECURITY;

-- Create policy to allow only admins to insert new badminton days
CREATE POLICY "Only admins can insert badminton days" 
ON public.badminton_days 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Also add policy for SELECT so users can view badminton days
CREATE POLICY "Anyone can view badminton days" 
ON public.badminton_days 
FOR SELECT 
TO authenticated 
USING (true);

-- Add policy for UPDATE - only admins can update
CREATE POLICY "Only admins can update badminton days" 
ON public.badminton_days 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Add policy for DELETE - only admins can delete
CREATE POLICY "Only admins can delete badminton days" 
ON public.badminton_days 
FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);
