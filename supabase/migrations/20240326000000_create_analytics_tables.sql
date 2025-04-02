-- Create analytics events table
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    event_data JSONB,
    user_id UUID REFERENCES auth.users(id),
    patient_id UUID REFERENCES patients(id),
    provider_id UUID REFERENCES providers(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create analytics metrics table
CREATE TABLE analytics_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_type TEXT NOT NULL,
    metric_value JSONB,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    patient_id UUID REFERENCES patients(id),
    provider_id UUID REFERENCES providers(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create analytics reports table
CREATE TABLE analytics_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_type TEXT NOT NULL,
    report_data JSONB,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    patient_id UUID REFERENCES patients(id),
    provider_id UUID REFERENCES providers(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_patient ON analytics_events(patient_id);
CREATE INDEX idx_analytics_events_provider ON analytics_events(provider_id);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at);

CREATE INDEX idx_analytics_metrics_type ON analytics_metrics(metric_type);
CREATE INDEX idx_analytics_metrics_patient ON analytics_metrics(patient_id);
CREATE INDEX idx_analytics_metrics_provider ON analytics_metrics(provider_id);
CREATE INDEX idx_analytics_metrics_period ON analytics_metrics(period_start, period_end);

CREATE INDEX idx_analytics_reports_type ON analytics_reports(report_type);
CREATE INDEX idx_analytics_reports_patient ON analytics_reports(patient_id);
CREATE INDEX idx_analytics_reports_provider ON analytics_reports(provider_id);
CREATE INDEX idx_analytics_reports_period ON analytics_reports(period_start, period_end);

-- Create RLS policies
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_reports ENABLE ROW LEVEL SECURITY;

-- Analytics events policies
CREATE POLICY "Users can view their own analytics events"
    ON analytics_events FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM patients
            WHERE patients.id = analytics_events.patient_id
            AND patients.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM providers
            WHERE providers.id = analytics_events.provider_id
            AND providers.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert analytics events"
    ON analytics_events FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Analytics metrics policies
CREATE POLICY "Users can view their own analytics metrics"
    ON analytics_metrics FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM patients
            WHERE patients.id = analytics_metrics.patient_id
            AND patients.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM providers
            WHERE providers.id = analytics_metrics.provider_id
            AND providers.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert analytics metrics"
    ON analytics_metrics FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Analytics reports policies
CREATE POLICY "Users can view their own analytics reports"
    ON analytics_reports FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM patients
            WHERE patients.id = analytics_reports.patient_id
            AND patients.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM providers
            WHERE providers.id = analytics_reports.provider_id
            AND providers.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert analytics reports"
    ON analytics_reports FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create functions for analytics
CREATE OR REPLACE FUNCTION calculate_patient_engagement_metrics(
    p_patient_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
) RETURNS JSONB AS $$
DECLARE
    v_metrics JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_sessions', COUNT(DISTINCT DATE_TRUNC('day', created_at)),
        'active_days', COUNT(DISTINCT DATE_TRUNC('day', created_at)),
        'event_counts', jsonb_object_agg(
            event_type,
            COUNT(*)
        )
    ) INTO v_metrics
    FROM analytics_events
    WHERE patient_id = p_patient_id
    AND created_at BETWEEN p_start_date AND p_end_date;

    RETURN v_metrics;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_treatment_success_metrics(
    p_patient_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
) RETURNS JSONB AS $$
DECLARE
    v_metrics JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_plans', COUNT(DISTINCT tp.id),
        'completed_plans', COUNT(DISTINCT CASE WHEN tp.status = 'completed' THEN tp.id END),
        'milestone_completion_rate', ROUND(
            COUNT(DISTINCT CASE WHEN tm.status = 'completed' THEN tm.id END)::float / 
            NULLIF(COUNT(DISTINCT tm.id), 0) * 100,
            2
        )
    ) INTO v_metrics
    FROM treatment_plans tp
    LEFT JOIN treatment_milestones tm ON tm.plan_id = tp.id
    WHERE tp.patient_id = p_patient_id
    AND tp.created_at BETWEEN p_start_date AND p_end_date;

    RETURN v_metrics;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_appointment_metrics(
    p_patient_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
) RETURNS JSONB AS $$
DECLARE
    v_metrics JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_appointments', COUNT(*),
        'attended_appointments', COUNT(CASE WHEN status = 'completed' THEN 1 END),
        'cancelled_appointments', COUNT(CASE WHEN status = 'cancelled' THEN 1 END),
        'attendance_rate', ROUND(
            COUNT(CASE WHEN status = 'completed' THEN 1 END)::float / 
            NULLIF(COUNT(*), 0) * 100,
            2
        )
    ) INTO v_metrics
    FROM appointments
    WHERE patient_id = p_patient_id
    AND scheduled_date BETWEEN p_start_date AND p_end_date;

    RETURN v_metrics;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic metric calculation
CREATE OR REPLACE FUNCTION update_analytics_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert patient engagement metrics
    INSERT INTO analytics_metrics (
        metric_type,
        metric_value,
        period_start,
        period_end,
        patient_id
    )
    SELECT
        'patient_engagement',
        calculate_patient_engagement_metrics(
            NEW.patient_id,
            DATE_TRUNC('day', NEW.created_at),
            DATE_TRUNC('day', NEW.created_at) + INTERVAL '1 day'
        ),
        DATE_TRUNC('day', NEW.created_at),
        DATE_TRUNC('day', NEW.created_at) + INTERVAL '1 day',
        NEW.patient_id;

    -- Insert treatment success metrics
    INSERT INTO analytics_metrics (
        metric_type,
        metric_value,
        period_start,
        period_end,
        patient_id
    )
    SELECT
        'treatment_success',
        calculate_treatment_success_metrics(
            NEW.patient_id,
            DATE_TRUNC('day', NEW.created_at),
            DATE_TRUNC('day', NEW.created_at) + INTERVAL '1 day'
        ),
        DATE_TRUNC('day', NEW.created_at),
        DATE_TRUNC('day', NEW.created_at) + INTERVAL '1 day',
        NEW.patient_id;

    -- Insert appointment metrics
    INSERT INTO analytics_metrics (
        metric_type,
        metric_value,
        period_start,
        period_end,
        patient_id
    )
    SELECT
        'appointments',
        calculate_appointment_metrics(
            NEW.patient_id,
            DATE_TRUNC('day', NEW.created_at),
            DATE_TRUNC('day', NEW.created_at) + INTERVAL '1 day'
        ),
        DATE_TRUNC('day', NEW.created_at),
        DATE_TRUNC('day', NEW.created_at) + INTERVAL '1 day',
        NEW.patient_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_analytics_metrics_trigger
    AFTER INSERT ON analytics_events
    FOR EACH ROW
    EXECUTE FUNCTION update_analytics_metrics(); 