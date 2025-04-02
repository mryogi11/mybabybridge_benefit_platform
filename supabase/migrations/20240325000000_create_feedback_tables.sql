-- Create feedback_categories table
CREATE TABLE feedback_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create provider_reviews table
CREATE TABLE provider_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  category_id UUID REFERENCES feedback_categories(id) ON DELETE SET NULL,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create treatment_feedback table
CREATE TABLE treatment_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  treatment_plan_id UUID REFERENCES treatment_plans(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  category_id UUID REFERENCES feedback_categories(id) ON DELETE SET NULL,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create feedback_responses table
CREATE TABLE feedback_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feedback_id UUID NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('provider', 'treatment')),
  responder_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_provider_reviews_patient_id ON provider_reviews(patient_id);
CREATE INDEX idx_provider_reviews_provider_id ON provider_reviews(provider_id);
CREATE INDEX idx_provider_reviews_category_id ON provider_reviews(category_id);
CREATE INDEX idx_treatment_feedback_patient_id ON treatment_feedback(patient_id);
CREATE INDEX idx_treatment_feedback_treatment_plan_id ON treatment_feedback(treatment_plan_id);
CREATE INDEX idx_treatment_feedback_category_id ON treatment_feedback(category_id);
CREATE INDEX idx_feedback_responses_feedback_id ON feedback_responses(feedback_id);
CREATE INDEX idx_feedback_responses_responder_id ON feedback_responses(responder_id);

-- Create updated_at trigger function if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END $$;

-- Create triggers
CREATE TRIGGER update_provider_reviews_updated_at
  BEFORE UPDATE ON provider_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_treatment_feedback_updated_at
  BEFORE UPDATE ON treatment_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedback_responses_updated_at
  BEFORE UPDATE ON feedback_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE provider_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;

-- Provider reviews policies
CREATE POLICY "Patients can view provider reviews"
  ON provider_reviews FOR SELECT
  USING (true);

CREATE POLICY "Patients can create provider reviews"
  ON provider_reviews FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM patients WHERE id = patient_id)
  );

CREATE POLICY "Patients can update their provider reviews"
  ON provider_reviews FOR UPDATE
  USING (
    auth.uid() IN (SELECT user_id FROM patients WHERE id = patient_id)
  );

CREATE POLICY "Patients can delete their provider reviews"
  ON provider_reviews FOR DELETE
  USING (
    auth.uid() IN (SELECT user_id FROM patients WHERE id = patient_id)
  );

-- Treatment feedback policies
CREATE POLICY "Patients can view treatment feedback"
  ON treatment_feedback FOR SELECT
  USING (true);

CREATE POLICY "Patients can create treatment feedback"
  ON treatment_feedback FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM patients WHERE id = patient_id)
  );

CREATE POLICY "Patients can update their treatment feedback"
  ON treatment_feedback FOR UPDATE
  USING (
    auth.uid() IN (SELECT user_id FROM patients WHERE id = patient_id)
  );

CREATE POLICY "Patients can delete their treatment feedback"
  ON treatment_feedback FOR DELETE
  USING (
    auth.uid() IN (SELECT user_id FROM patients WHERE id = patient_id)
  );

-- Feedback responses policies
CREATE POLICY "Users can view feedback responses"
  ON feedback_responses FOR SELECT
  USING (true);

CREATE POLICY "Providers can create feedback responses"
  ON feedback_responses FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM providers WHERE id = (
      SELECT provider_id FROM provider_reviews WHERE id = feedback_id
    ))
  );

CREATE POLICY "Providers can update their feedback responses"
  ON feedback_responses FOR UPDATE
  USING (
    auth.uid() IN (SELECT user_id FROM providers WHERE id = (
      SELECT provider_id FROM provider_reviews WHERE id = feedback_id
    ))
  );

CREATE POLICY "Providers can delete their feedback responses"
  ON feedback_responses FOR DELETE
  USING (
    auth.uid() IN (SELECT user_id FROM providers WHERE id = (
      SELECT provider_id FROM provider_reviews WHERE id = feedback_id
    ))
  );

-- Insert default feedback categories
INSERT INTO feedback_categories (name, description) VALUES
  ('Quality of Care', 'Overall quality of medical care provided'),
  ('Communication', 'Effectiveness of communication with the provider'),
  ('Professionalism', 'Professional conduct and bedside manner'),
  ('Treatment Effectiveness', 'Effectiveness of prescribed treatments'),
  ('Wait Times', 'Timeliness of appointments and care'),
  ('Facility', 'Cleanliness and comfort of the facility'),
  ('Cost', 'Value for money and cost transparency'),
  ('Accessibility', 'Ease of access to care and appointments'); 