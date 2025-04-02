-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('appointment_scheduled', 'appointment_reminder', 'appointment_cancelled', 'appointment_completed')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_appointment_id_idx ON public.notifications(appointment_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications(created_at);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create function to send notification
CREATE OR REPLACE FUNCTION public.send_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_appointment_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        appointment_id
    ) VALUES (
        p_user_id,
        p_type,
        p_title,
        p_message,
        p_appointment_id
    ) RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to send notifications when appointments are created
CREATE OR REPLACE FUNCTION public.handle_appointment_notifications()
RETURNS TRIGGER AS $$
BEGIN
    -- Send notification to patient
    PERFORM public.send_notification(
        NEW.patient_id,
        'appointment_scheduled',
        'Appointment Scheduled',
        'Your appointment with ' || (
            SELECT first_name || ' ' || last_name
            FROM public.providers
            WHERE id = NEW.provider_id
        ) || ' has been scheduled for ' || 
        to_char(NEW.appointment_date, 'FMDay, FMMonth DD, YYYY at HH24:MI'),
        NEW.id
    );

    -- Send notification to provider
    PERFORM public.send_notification(
        NEW.provider_id,
        'appointment_scheduled',
        'New Appointment',
        'New appointment scheduled with ' || (
            SELECT first_name || ' ' || last_name
            FROM public.patients
            WHERE id = NEW.patient_id
        ) || ' for ' || 
        to_char(NEW.appointment_date, 'FMDay, FMMonth DD, YYYY at HH24:MI'),
        NEW.id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER appointment_notifications_trigger
    AFTER INSERT ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_appointment_notifications();

-- Create function to send appointment reminders
CREATE OR REPLACE FUNCTION public.send_appointment_reminders()
RETURNS void AS $$
BEGIN
    -- Send reminders for appointments tomorrow
    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        appointment_id
    )
    SELECT 
        a.patient_id,
        'appointment_reminder',
        'Appointment Reminder',
        'Your appointment with ' || p.first_name || ' ' || p.last_name || 
        ' is scheduled for tomorrow at ' || to_char(a.appointment_date, 'HH24:MI'),
        a.id
    FROM public.appointments a
    JOIN public.providers p ON p.id = a.provider_id
    WHERE a.status = 'scheduled'
    AND a.appointment_date::date = (CURRENT_DATE + INTERVAL '1 day')::date;

    -- Send reminders to providers
    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        appointment_id
    )
    SELECT 
        a.provider_id,
        'appointment_reminder',
        'Appointment Reminder',
        'You have an appointment with ' || p.first_name || ' ' || p.last_name || 
        ' tomorrow at ' || to_char(a.appointment_date, 'HH24:MI'),
        a.id
    FROM public.appointments a
    JOIN public.patients p ON p.id = a.patient_id
    WHERE a.status = 'scheduled'
    AND a.appointment_date::date = (CURRENT_DATE + INTERVAL '1 day')::date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 