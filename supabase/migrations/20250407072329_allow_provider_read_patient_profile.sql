-- RLS Policy: Allow providers to read profiles of patients they have appointments with
CREATE POLICY "Providers can view profiles of their patients"
ON public.patient_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.appointments a
    JOIN public.providers p ON a.provider_id = p.id
    WHERE 
      a.patient_id = public.patient_profiles.user_id -- Link appointment to the profile being checked
      AND p.user_id = auth.uid() -- Link provider profile to the logged-in user
  )
);
