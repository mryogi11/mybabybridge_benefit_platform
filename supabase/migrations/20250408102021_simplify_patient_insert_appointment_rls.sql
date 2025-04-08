-- Drop the previous (potentially recursive) insert policy
DROP POLICY IF EXISTS "Patients can insert their own appointments" ON public.appointments;

-- Create a simpler policy checking the patient_id against the logged-in user's profile ID
CREATE POLICY "Patients can insert their own appointments" 
ON public.appointments 
FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated' AND
  patient_id = (
    SELECT id
    FROM public.patient_profiles
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);
