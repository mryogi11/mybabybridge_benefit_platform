-- Policy: Allow authenticated users (patients) to select their own appointments.
-- Uses the security definer helper function to prevent recursion.
CREATE POLICY "Patients can view their own appointments" 
ON public.appointments 
FOR SELECT 
USING (
  public.is_users_patient_profile(patient_id)
);

-- Optional but recommended: Policy for Providers to view their appointments
-- This might already exist, but defining it ensures clarity.
-- It assumes providers have a user_id linked in the providers table.
CREATE OR REPLACE FUNCTION public.is_users_provider_profile(profile_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM providers p
    WHERE p.id = profile_id AND p.user_id = auth.uid()
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_users_provider_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_users_provider_profile(uuid) TO service_role;

DROP POLICY IF EXISTS "Providers can view their own appointments" ON public.appointments;
CREATE POLICY "Providers can view their own appointments"
ON public.appointments
FOR SELECT
USING (
  public.is_users_provider_profile(provider_id)
);

-- Grant usage on schema and select on tables if needed for the functions/policies
-- These might be overly broad depending on your setup, adjust as necessary.
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON TABLE public.patient_profiles TO authenticated;
GRANT SELECT ON TABLE public.providers TO authenticated;
GRANT SELECT ON TABLE public.appointments TO authenticated; 