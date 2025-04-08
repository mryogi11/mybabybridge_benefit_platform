-- 1. Create the helper function
CREATE OR REPLACE FUNCTION public.is_users_patient_profile(profile_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
-- Set a secure search_path: reference tables by schema
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM patient_profiles pp
    WHERE pp.id = profile_id AND pp.user_id = auth.uid()
  );
$$;

-- Grant execute permission to the authenticated role
GRANT EXECUTE ON FUNCTION public.is_users_patient_profile(uuid) TO authenticated;

-- 2. Drop the previous insert policy
DROP POLICY IF EXISTS "Patients can insert their own appointments" ON public.appointments;

-- 3. Create the new policy using the helper function
CREATE POLICY "Patients can insert their own appointments" 
ON public.appointments 
FOR INSERT 
WITH CHECK (
  public.is_users_patient_profile(patient_id)
);
