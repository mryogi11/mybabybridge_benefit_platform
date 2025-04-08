-- Drop the incorrect foreign key constraint referencing patient_profiles.user_id
ALTER TABLE public.appointments
DROP CONSTRAINT IF EXISTS appointments_patient_user_id_fkey;

-- Add the correct foreign key constraint referencing patient_profiles.id
ALTER TABLE public.appointments
ADD CONSTRAINT appointments_patient_profile_id_fkey -- Use a new, clear name
FOREIGN KEY (patient_id) REFERENCES public.patient_profiles(id) ON DELETE CASCADE;
