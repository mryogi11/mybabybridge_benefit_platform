-- Commenting out potentially duplicate table definitions
-- -- Create education content categories
-- CREATE TABLE education_categories (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     name TEXT NOT NULL,
--     description TEXT,
--     icon_url TEXT,
--     created_at TIMESTAMPTZ DEFAULT NOW(),
--     updated_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- -- Create education content
-- CREATE TABLE education_content (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     category_id UUID REFERENCES education_categories(id),
--     title TEXT NOT NULL,
--     content TEXT NOT NULL,
--     media_url TEXT,
--     media_type TEXT,
--     difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
--     estimated_duration INTEGER, -- in minutes
--     created_at TIMESTAMPTZ DEFAULT NOW(),
--     updated_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- -- Create patient education progress
-- CREATE TABLE patient_education_progress (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     patient_id UUID REFERENCES patient_profiles(id), -- Corrected reference
--     content_id UUID REFERENCES education_content(id),
--     status TEXT CHECK (status IN ('not_started', 'in_progress', 'completed')),
--     completion_date TIMESTAMPTZ,
--     notes TEXT,
--     created_at TIMESTAMPTZ DEFAULT NOW(),
--     updated_at TIMESTAMPTZ DEFAULT NOW(),
--     UNIQUE(patient_id, content_id)
-- );

-- -- Create education content tags
-- CREATE TABLE education_tags (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     name TEXT NOT NULL UNIQUE,
--     created_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- -- Create education content tag associations
-- CREATE TABLE education_content_tags (
--     content_id UUID REFERENCES education_content(id),
--     tag_id UUID REFERENCES education_tags(id),
--     PRIMARY KEY (content_id, tag_id)
-- );

-- Create indexes (Comment out indexes for removed tables)
-- CREATE INDEX idx_education_content_category ON education_content(category_id);
-- CREATE INDEX idx_patient_education_progress_patient ON patient_education_progress(patient_id);
-- CREATE INDEX idx_patient_education_progress_content ON patient_education_progress(content_id);
-- CREATE INDEX idx_education_content_tags_content ON education_content_tags(content_id);
-- CREATE INDEX idx_education_content_tags_tag ON education_content_tags(tag_id);

-- Create updated_at trigger function (Already removed in feedback, should be fine)
-- CREATE OR REPLACE FUNCTION update_updated_at_column()
-- ...

-- Create triggers (Comment out triggers for removed tables)
-- CREATE TRIGGER update_education_categories_updated_at
--     BEFORE UPDATE ON education_categories
--     FOR EACH ROW
--     EXECUTE FUNCTION update_updated_at_column();
-- 
-- CREATE TRIGGER update_education_content_updated_at
--     BEFORE UPDATE ON education_content
--     FOR EACH ROW
--     EXECUTE FUNCTION update_updated_at_column();
-- 
-- CREATE TRIGGER update_patient_education_progress_updated_at
--     BEFORE UPDATE ON patient_education_progress
--     FOR EACH ROW
--     EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies (Comment out policies for removed tables)
-- ALTER TABLE education_categories ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE education_content ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE patient_education_progress ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE education_tags ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE education_content_tags ENABLE ROW LEVEL SECURITY;

-- Education categories policies
-- CREATE POLICY "Anyone can view education categories"
-- ...
-- CREATE POLICY "Only providers can manage education categories"
-- ...

-- Education content policies
-- CREATE POLICY "Anyone can view education content"
-- ...
-- CREATE POLICY "Only providers can manage education content"
-- ...

-- Patient education progress policies
-- DROP POLICY IF EXISTS "Patients can view their own progress" ON patient_education_progress;
-- CREATE POLICY "Patients can view their own progress"
-- ...
-- DROP POLICY IF EXISTS "Patients can update their own progress" ON patient_education_progress;
-- CREATE POLICY "Patients can update their own progress"
-- ...

-- Education tags policies
-- CREATE POLICY "Anyone can view education tags"
-- ...
-- CREATE POLICY "Only providers can manage education tags"
-- ...

-- Education content tags policies
-- CREATE POLICY "Anyone can view education content tags"
-- ...
-- CREATE POLICY "Only providers can manage education content tags"
-- ... 

-- Note: This file might become empty after commenting out. That's okay. 