-- 0. Define is_admin function (if not already defined elsewhere)
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER -- Important for accessing users table reliably
-- Set a secure search_path
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = user_id AND u.role = 'admin'
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO service_role; -- If needed

-- 1. Enable RLS on patient_profiles if not already enabled
ALTER TABLE public.patient_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Allow providers to view profiles of patients they have appointments with.
-- Need a way to identify the current user is a provider and get their provider_id.
-- We'll use the is_users_provider_profile function created earlier.
DROP POLICY IF EXISTS "Providers can view profiles of their patients" ON public.patient_profiles;
CREATE POLICY "Providers can view profiles of their patients" 
ON public.patient_profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM public.providers p
    JOIN public.appointments a ON a.provider_id = p.id
    WHERE p.user_id = auth.uid() -- Check if the logged-in user is the provider
      AND a.patient_id = patient_profiles.id -- Check if this patient profile is linked via an appointment
  )
);

-- 3. Ensure Patients can view their own profile (DROP/CREATE)
DROP POLICY IF EXISTS "Patients can view their own profile" ON public.patient_profiles;
CREATE POLICY "Patients can view their own profile"
ON public.patient_profiles
FOR SELECT
USING (user_id = auth.uid());

-- 4. Ensure Admins/Staff can view all profiles (DROP/CREATE)
DROP POLICY IF EXISTS "Admins can view all patient profiles" ON public.patient_profiles;
CREATE POLICY "Admins can view all patient profiles"
ON public.patient_profiles
FOR SELECT
USING (auth.role() = 'authenticated' AND public.is_admin(auth.uid())); -- Assuming is_admin function exists
