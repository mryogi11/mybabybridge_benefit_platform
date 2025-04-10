-- Policy: Allow admin users to select all appointments.
DROP POLICY IF EXISTS "Admins can view all appointments" ON public.appointments;
CREATE POLICY "Admins can view all appointments" 
ON public.appointments 
FOR SELECT 
USING (
  auth.role() = 'authenticated' AND
  public.is_admin(auth.uid()) -- Use the existing helper function
); 