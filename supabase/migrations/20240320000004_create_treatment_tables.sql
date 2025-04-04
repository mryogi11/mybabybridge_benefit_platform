-- Create treatment plans table
CREATE TABLE treatment_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create treatment milestones table
CREATE TABLE treatment_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    treatment_plan_id UUID REFERENCES treatment_plans(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create milestone dependencies table
CREATE TABLE milestone_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    milestone_id UUID REFERENCES treatment_milestones(id) ON DELETE CASCADE,
    depends_on_milestone_id UUID REFERENCES treatment_milestones(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(milestone_id, depends_on_milestone_id)
);

-- Create treatment notes table
CREATE TABLE treatment_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    treatment_plan_id UUID REFERENCES treatment_plans(id) ON DELETE CASCADE,
    milestone_id UUID REFERENCES treatment_milestones(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_treatment_plans_patient_id ON treatment_plans(patient_id);
CREATE INDEX idx_treatment_plans_provider_id ON treatment_plans(provider_id);
CREATE INDEX idx_treatment_milestones_plan_id ON treatment_milestones(treatment_plan_id);
CREATE INDEX idx_treatment_milestones_appointment_id ON treatment_milestones(appointment_id);
CREATE INDEX idx_treatment_notes_plan_id ON treatment_notes(treatment_plan_id);
CREATE INDEX idx_treatment_notes_milestone_id ON treatment_notes(milestone_id);
CREATE INDEX idx_treatment_notes_appointment_id ON treatment_notes(appointment_id);
CREATE INDEX idx_milestone_dependencies_milestone_id ON milestone_dependencies(milestone_id);
CREATE INDEX idx_milestone_dependencies_depends_on_id ON milestone_dependencies(depends_on_milestone_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_treatment_plans_updated_at
    BEFORE UPDATE ON treatment_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_treatment_milestones_updated_at
    BEFORE UPDATE ON treatment_milestones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_treatment_notes_updated_at
    BEFORE UPDATE ON treatment_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to update milestone status when appointment is completed
CREATE OR REPLACE FUNCTION update_milestone_on_appointment_completion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' THEN
        UPDATE treatment_milestones
        SET status = 'completed',
            updated_at = NOW()
        WHERE appointment_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER appointment_completion_milestone_trigger
    AFTER UPDATE ON appointments
    FOR EACH ROW
    WHEN (OLD.status = 'scheduled' AND NEW.status = 'completed')
    EXECUTE FUNCTION update_milestone_on_appointment_completion();

-- Create function to check milestone dependencies
CREATE OR REPLACE FUNCTION check_milestone_dependencies()
RETURNS TRIGGER AS $$
BEGIN
    -- If the milestone is being marked as completed
    IF NEW.status = 'completed' THEN
        -- Check if all dependencies are completed
        IF EXISTS (
            SELECT 1 FROM milestone_dependencies md
            JOIN treatment_milestones tm ON tm.id = md.depends_on_milestone_id
            WHERE md.milestone_id = NEW.id
            AND tm.status != 'completed'
        ) THEN
            RAISE EXCEPTION 'Cannot complete milestone: dependencies not met';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for milestone dependencies
CREATE TRIGGER check_milestone_dependencies_trigger
    BEFORE UPDATE ON treatment_milestones
    FOR EACH ROW
    EXECUTE FUNCTION check_milestone_dependencies();

-- Create function to send milestone completion notification
CREATE OR REPLACE FUNCTION send_milestone_completion_notification()
RETURNS TRIGGER AS $$
DECLARE
    patient_id UUID;
    next_milestone_id UUID;
    next_milestone_title TEXT;
BEGIN
    -- Only proceed if the milestone is being marked as completed
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Get the patient ID from the treatment plan
        SELECT tp.patient_id INTO patient_id
        FROM treatment_plans tp
        WHERE tp.id = NEW.treatment_plan_id;

        -- Find the next milestone that depends on this one
        SELECT tm.id, tm.title INTO next_milestone_id, next_milestone_title
        FROM milestone_dependencies md
        JOIN treatment_milestones tm ON tm.id = md.milestone_id
        WHERE md.depends_on_milestone_id = NEW.id
        AND tm.status = 'pending'
        LIMIT 1;

        -- If there's a next milestone, create a notification
        IF next_milestone_id IS NOT NULL THEN
            INSERT INTO notifications (
                user_id,
                type,
                title,
                message,
                is_read
            ) VALUES (
                patient_id,
                'milestone_completed',
                'Milestone Completed',
                format('The milestone "%s" has been completed. You can now proceed with "%s".', NEW.title, next_milestone_title),
                false
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for milestone completion notifications
CREATE TRIGGER milestone_completion_notification_trigger
    AFTER UPDATE ON treatment_milestones
    FOR EACH ROW
    EXECUTE FUNCTION send_milestone_completion_notification();

-- Row Level Security (RLS) policies
ALTER TABLE treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_dependencies ENABLE ROW LEVEL SECURITY;

-- Treatment plans policies
CREATE POLICY "Patients can view their own treatment plans"
    ON treatment_plans FOR SELECT
    USING (auth.uid() = patient_id);

CREATE POLICY "Providers can view their patients' treatment plans"
    ON treatment_plans FOR SELECT
    USING (auth.uid() = provider_id);

CREATE POLICY "Providers can create treatment plans"
    ON treatment_plans FOR INSERT
    WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Providers can update treatment plans"
    ON treatment_plans FOR UPDATE
    USING (auth.uid() = provider_id)
    WITH CHECK (auth.uid() = provider_id);

-- Treatment milestones policies
CREATE POLICY "Patients can view their treatment milestones"
    ON treatment_milestones FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM treatment_plans
            WHERE treatment_plans.id = treatment_milestones.treatment_plan_id
            AND treatment_plans.patient_id = auth.uid()
        )
    );

CREATE POLICY "Providers can view treatment milestones"
    ON treatment_milestones FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM treatment_plans
            WHERE treatment_plans.id = treatment_milestones.treatment_plan_id
            AND treatment_plans.provider_id = auth.uid()
        )
    );

CREATE POLICY "Providers can manage treatment milestones"
    ON treatment_milestones FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM treatment_plans
            WHERE treatment_plans.id = treatment_milestones.treatment_plan_id
            AND treatment_plans.provider_id = auth.uid()
        )
    );

-- Treatment notes policies
CREATE POLICY "Patients can view their treatment notes"
    ON treatment_notes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM treatment_plans
            WHERE treatment_plans.id = treatment_notes.treatment_plan_id
            AND treatment_plans.patient_id = auth.uid()
        )
    );

CREATE POLICY "Providers can view treatment notes"
    ON treatment_notes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM treatment_plans
            WHERE treatment_plans.id = treatment_notes.treatment_plan_id
            AND treatment_plans.provider_id = auth.uid()
        )
    );

CREATE POLICY "Providers can manage treatment notes"
    ON treatment_notes FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM treatment_plans
            WHERE treatment_plans.id = treatment_notes.treatment_plan_id
            AND treatment_plans.provider_id = auth.uid()
        )
    );

-- Milestone dependencies policies
CREATE POLICY "Patients can view milestone dependencies"
    ON milestone_dependencies FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM treatment_milestones tm
            JOIN treatment_plans tp ON tp.id = tm.treatment_plan_id
            WHERE tm.id = milestone_dependencies.milestone_id
            AND tp.patient_id = auth.uid()
        )
    );

CREATE POLICY "Providers can view milestone dependencies"
    ON milestone_dependencies FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM treatment_milestones tm
            JOIN treatment_plans tp ON tp.id = tm.treatment_plan_id
            WHERE tm.id = milestone_dependencies.milestone_id
            AND tp.provider_id = auth.uid()
        )
    );

CREATE POLICY "Providers can manage milestone dependencies"
    ON milestone_dependencies FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM treatment_milestones tm
            JOIN treatment_plans tp ON tp.id = tm.treatment_plan_id
            WHERE tm.id = milestone_dependencies.milestone_id
            AND tp.provider_id = auth.uid()
        )
    ); 