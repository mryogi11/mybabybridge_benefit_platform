-- Create function to send appointment notifications (Corrected Version)
-- This version looks up the provider's actual user_id
CREATE OR REPLACE FUNCTION public.send_appointment_notification(
    p_appointment_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT
) RETURNS void AS $$
DECLARE
    v_patient_user_id UUID;    -- Correctly represents the patient's user_id from appointments.patient_id
    v_provider_profile_id UUID;-- Represents the provider's profile ID (PK) from appointments.provider_id
    v_provider_user_id UUID;   -- Variable to store the looked-up provider's user_id
BEGIN
    -- Get patient user_id and provider profile_id from the appointment
    SELECT patient_id, provider_id INTO v_patient_user_id, v_provider_profile_id
    FROM public.appointments
    WHERE id = p_appointment_id;

    -- Create notification for patient (using their user_id directly)
    IF v_patient_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, message, appointment_id)
        VALUES (v_patient_user_id, p_type, p_title, p_message, p_appointment_id);
    END IF;

    -- Look up the provider's actual user_id from the providers table using the provider_profile_id
    IF v_provider_profile_id IS NOT NULL THEN
        SELECT user_id INTO v_provider_user_id
        FROM public.providers
        WHERE id = v_provider_profile_id;

        -- Create notification for provider (using the looked-up user_id)
        IF v_provider_user_id IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, type, title, message, appointment_id)
            VALUES (v_provider_user_id, p_type, p_title, p_message, p_appointment_id);
        END IF;
    END IF;

END;
$$ LANGUAGE plpgsql
SECURITY DEFINER -- Ensure it has permissions to read providers table
SET search_path = public;
