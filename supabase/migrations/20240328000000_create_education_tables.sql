-- Create education categories table
CREATE TABLE education_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create education resources table
CREATE TABLE education_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES education_categories(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    media_url TEXT,
    media_type TEXT CHECK (media_type IN ('image', 'video', 'document', NULL)),
    reading_time INTEGER, -- in minutes
    difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create patient education progress table
CREATE TABLE patient_education_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    resource_id UUID REFERENCES education_resources(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('not_started', 'in_progress', 'completed')),
    progress_percentage INTEGER CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    last_accessed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(patient_id, resource_id)
);

-- Create indexes
CREATE INDEX idx_education_resources_category ON education_resources(category_id);
CREATE INDEX idx_patient_education_progress_patient ON patient_education_progress(patient_id);
CREATE INDEX idx_patient_education_progress_resource ON patient_education_progress(resource_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_education_categories_updated_at
    BEFORE UPDATE ON education_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_education_resources_updated_at
    BEFORE UPDATE ON education_resources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patient_education_progress_updated_at
    BEFORE UPDATE ON patient_education_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies
ALTER TABLE education_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE education_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_education_progress ENABLE ROW LEVEL SECURITY;

-- Education categories policies
CREATE POLICY "Anyone can view education categories"
    ON education_categories FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only providers can manage education categories"
    ON education_categories FOR ALL
    TO authenticated
    USING (auth.uid() IN (SELECT user_id FROM providers))
    WITH CHECK (auth.uid() IN (SELECT user_id FROM providers));

-- Education resources policies
CREATE POLICY "Anyone can view education resources"
    ON education_resources FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only providers can manage education resources"
    ON education_resources FOR ALL
    TO authenticated
    USING (auth.uid() IN (SELECT user_id FROM providers))
    WITH CHECK (auth.uid() IN (SELECT user_id FROM providers));

-- Patient education progress policies
CREATE POLICY "Patients can view their own education progress"
    ON patient_education_progress FOR SELECT
    TO authenticated
    USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY "Patients can update their own education progress"
    ON patient_education_progress FOR UPDATE
    TO authenticated
    USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()))
    WITH CHECK (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY "Providers can view patient education progress"
    ON patient_education_progress FOR SELECT
    TO authenticated
    USING (auth.uid() IN (SELECT user_id FROM providers));

-- Insert some sample education categories
INSERT INTO education_categories (name, description, icon_url) VALUES
    ('General Health', 'Basic health information and wellness tips', 'health_icon.png'),
    ('Mental Health', 'Resources for mental and emotional well-being', 'mental_health_icon.png'),
    ('Nutrition', 'Healthy eating and dietary guidelines', 'nutrition_icon.png'),
    ('Exercise', 'Physical activity and fitness guidance', 'exercise_icon.png'),
    ('Chronic Conditions', 'Information about managing chronic health conditions', 'chronic_conditions_icon.png');

-- Insert some sample education resources
INSERT INTO education_resources (category_id, title, description, content, reading_time, difficulty_level) VALUES
    ((SELECT id FROM education_categories WHERE name = 'General Health'), 
     'Understanding Blood Pressure', 
     'Learn about blood pressure, its importance, and how to maintain healthy levels.',
     'Blood pressure is a measure of the force that your heart uses to pump blood around your body...',
     5,
     'beginner'),
    
    ((SELECT id FROM education_categories WHERE name = 'Mental Health'),
     'Stress Management Techniques',
     'Effective strategies for managing stress and maintaining mental well-being.',
     'Stress is a natural response to pressure, but when it becomes chronic, it can affect your health...',
     8,
     'intermediate'),
    
    ((SELECT id FROM education_categories WHERE name = 'Nutrition'),
     'Healthy Eating Guidelines',
     'Basic principles of healthy eating and balanced nutrition.',
     'A balanced diet is essential for maintaining good health and preventing chronic diseases...',
     10,
     'beginner'); 