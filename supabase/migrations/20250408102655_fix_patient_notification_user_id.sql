-- Function to send appointment notifications (Corrected Patient Logic)
CREATE OR REPLACE FUNCTION public.send_appointment_notification(
    p_appointment_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT
) RETURNS void AS $$
DECLARE
    v_patient_profile_id UUID; -- Store the patient's PROFILE ID from the appointment
    v_provider_profile_id UUID;-- Store the provider's PROFILE ID from the appointment
    v_patient_auth_user_id UUID; -- Variable to store the looked-up patient's AUTH user_id
    v_provider_auth_user_id UUID; -- Variable to store the looked-up provider's AUTH user_id
BEGIN
    -- Get patient PROFILE id and provider PROFILE id from the appointment
    SELECT patient_id, provider_id INTO v_patient_profile_id, v_provider_profile_id
    FROM public.appointments
    WHERE id = p_appointment_id;

    -- Look up the patient's AUTH user_id using the patient_profile_id
    IF v_patient_profile_id IS NOT NULL THEN
        SELECT user_id INTO v_patient_auth_user_id
        FROM public.patient_profiles
        WHERE id = v_patient_profile_id;

        -- Create notification for patient (using the looked-up AUTH user_id)
        IF v_patient_auth_user_id IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, type, title, message, appointment_id)
            VALUES (v_patient_auth_user_id, p_type, p_title, p_message, p_appointment_id);
        END IF;
    END IF;

    -- Look up the provider's AUTH user_id using the provider_profile_id
    IF v_provider_profile_id IS NOT NULL THEN
        SELECT user_id INTO v_provider_auth_user_id
        FROM public.providers
        WHERE id = v_provider_profile_id;

        -- Create notification for provider (using the looked-up AUTH user_id)
        IF v_provider_auth_user_id IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, type, title, message, appointment_id)
            VALUES (v_provider_auth_user_id, p_type, p_title, p_message, p_appointment_id);
        END IF;
    END IF;

END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Ensure the function is still executable by authenticated users if triggers call it
-- (Grant might already exist, but safe to re-apply)
GRANT EXECUTE ON FUNCTION public.send_appointment_notification(UUID, TEXT, TEXT, TEXT) TO authenticated;
-- Grant execute for service_role if needed (e.g., if called by triggers created by service_role)
GRANT EXECUTE ON FUNCTION public.send_appointment_notification(UUID, TEXT, TEXT, TEXT) TO service_role;
