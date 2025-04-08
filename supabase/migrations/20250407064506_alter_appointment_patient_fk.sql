-- Drop the old foreign key constraint referencing patient_profiles.id
ALTER TABLE public.appointments
DROP CONSTRAINT IF EXISTS appointments_patient_id_fkey;

-- Add the new foreign key constraint referencing patient_profiles.user_id
-- Ensure patient_profiles.user_id has a UNIQUE constraint first
ALTER TABLE public.appointments
ADD CONSTRAINT appointments_patient_user_id_fkey
FOREIGN KEY (patient_id) REFERENCES public.patient_profiles(user_id) ON DELETE CASCADE;
