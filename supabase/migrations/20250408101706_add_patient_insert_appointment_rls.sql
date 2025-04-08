-- Enable RLS on the appointments table if not already enabled
-- It's safe to run this even if it's already enabled.
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users (patients) to insert appointments for themselves.
-- Assumes the patient_id in appointments matches the id in patient_profiles.
CREATE POLICY "Patients can insert their own appointments" 
ON public.appointments 
FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1
    FROM public.patient_profiles pp
    WHERE pp.user_id = auth.uid() -- Link to the logged-in user
    AND pp.id = appointments.patient_id -- Ensure the appointment's patient_id matches the user's profile ID
  )
);
