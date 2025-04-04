-- Create notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('appointment_scheduled', 'appointment_reminder', 'appointment_cancelled', 'appointment_completed')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_appointment_id ON notifications(appointment_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Create function to send appointment notifications
CREATE OR REPLACE FUNCTION send_appointment_notification(
    p_appointment_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT
) RETURNS void AS $$
DECLARE
    v_patient_id UUID;
    v_provider_id UUID;
BEGIN
    -- Get patient and provider IDs from the appointment
    SELECT patient_id, provider_id INTO v_patient_id, v_provider_id
    FROM appointments
    WHERE id = p_appointment_id;

    -- Create notification for patient
    INSERT INTO notifications (user_id, type, title, message, appointment_id)
    VALUES (v_patient_id, p_type, p_title, p_message, p_appointment_id);

    -- Create notification for provider
    INSERT INTO notifications (user_id, type, title, message, appointment_id)
    VALUES (v_provider_id, p_type, p_title, p_message, p_appointment_id);
END;
$$ LANGUAGE plpgsql;

-- Create function to send appointment reminders
CREATE OR REPLACE FUNCTION send_appointment_reminders() RETURNS void AS $$
DECLARE
    v_appointment RECORD;
BEGIN
    -- Get all upcoming appointments in the next 24 hours
    FOR v_appointment IN
        SELECT id, patient_id, provider_id, appointment_date
        FROM appointments
        WHERE status = 'scheduled'
        AND appointment_date BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
    LOOP
        -- Send reminder notification
        PERFORM send_appointment_notification(
            v_appointment.id,
            'appointment_reminder',
            'Upcoming Appointment Reminder',
            'You have an appointment scheduled for ' || 
            TO_CHAR(v_appointment.appointment_date, 'MM/DD/YYYY HH:MI AM')
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create function to update appointment status and send notifications
CREATE OR REPLACE FUNCTION update_appointment_status(
    p_appointment_id UUID,
    p_status TEXT
) RETURNS void AS $$
DECLARE
    v_appointment RECORD;
BEGIN
    -- Get appointment details
    SELECT * INTO v_appointment
    FROM appointments
    WHERE id = p_appointment_id;

    -- Update appointment status
    UPDATE appointments
    SET status = p_status,
        updated_at = NOW()
    WHERE id = p_appointment_id;

    -- Send appropriate notification based on status
    CASE p_status
        WHEN 'completed' THEN
            PERFORM send_appointment_notification(
                p_appointment_id,
                'appointment_completed',
                'Appointment Completed',
                'Your appointment has been marked as completed'
            );
        WHEN 'cancelled' THEN
            PERFORM send_appointment_notification(
                p_appointment_id,
                'appointment_cancelled',
                'Appointment Cancelled',
                'Your appointment has been cancelled'
            );
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to send notification when appointment is created
CREATE OR REPLACE FUNCTION appointment_created_notification()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM send_appointment_notification(
        NEW.id,
        'appointment_scheduled',
        'New Appointment Scheduled',
        'A new appointment has been scheduled for ' ||
        TO_CHAR(NEW.appointment_date, 'MM/DD/YYYY HH:MI AM')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER appointment_created_notification_trigger
    AFTER INSERT ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION appointment_created_notification();

-- Row Level Security (RLS) policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can mark their notifications as read"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id); 