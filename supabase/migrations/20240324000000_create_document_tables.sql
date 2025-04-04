-- Create document_categories table
CREATE TABLE document_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patient_profiles(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
  category_id UUID REFERENCES document_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_private BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document_shares table
CREATE TABLE document_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  shared_with UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('view', 'download', 'edit')),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_documents_patient_id ON documents(patient_id);
CREATE INDEX idx_documents_provider_id ON documents(provider_id);
CREATE INDEX idx_documents_category_id ON documents(category_id);
CREATE INDEX idx_document_shares_document_id ON document_shares(document_id);
CREATE INDEX idx_document_shares_shared_with ON document_shares(shared_with);

-- Create triggers (Ensure function handle_updated_at or similar exists)
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); -- Use the function assumed to exist

DROP TRIGGER IF EXISTS update_document_shares_updated_at ON document_shares;
CREATE TRIGGER update_document_shares_updated_at
  BEFORE UPDATE ON document_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); -- Use the function assumed to exist

-- Add RLS policies
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_shares ENABLE ROW LEVEL SECURITY;

-- Documents policies
DROP POLICY IF EXISTS "Patients can view their own documents" ON documents;
CREATE POLICY "Patients can view their own documents"
  ON documents FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM patient_profiles WHERE id = patient_id
      UNION
      SELECT user_id FROM providers WHERE id = provider_id
    )
  );

DROP POLICY IF EXISTS "Patients can insert their own documents" ON documents;
CREATE POLICY "Patients can insert their own documents"
  ON documents FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM patient_profiles WHERE id = patient_id)
  );

DROP POLICY IF EXISTS "Patients can update their own documents" ON documents;
CREATE POLICY "Patients can update their own documents"
  ON documents FOR UPDATE
  USING (
    auth.uid() IN (SELECT user_id FROM patient_profiles WHERE id = patient_id)
  );

DROP POLICY IF EXISTS "Patients can delete their own documents" ON documents;
CREATE POLICY "Patients can delete their own documents"
  ON documents FOR DELETE
  USING (
    auth.uid() IN (SELECT user_id FROM patient_profiles WHERE id = patient_id)
  );

-- Document shares policies
CREATE POLICY "Users can view their document shares"
  ON document_shares FOR SELECT
  USING (
    auth.uid() = shared_with OR
    auth.uid() IN (
      SELECT uploaded_by FROM documents WHERE id = document_id
    )
  );

CREATE POLICY "Users can create document shares"
  ON document_shares FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT uploaded_by FROM documents WHERE id = document_id
    )
  );

CREATE POLICY "Users can update their document shares"
  ON document_shares FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT uploaded_by FROM documents WHERE id = document_id
    )
  );

CREATE POLICY "Users can delete their document shares"
  ON document_shares FOR DELETE
  USING (
    auth.uid() IN (
      SELECT uploaded_by FROM documents WHERE id = document_id
    )
  );

-- Insert default document categories
INSERT INTO document_categories (name, description) VALUES
  ('Medical Records', 'Official medical records and reports'),
  ('Prescriptions', 'Prescription documents and medication lists'),
  ('Insurance', 'Insurance-related documents and claims'),
  ('Lab Results', 'Laboratory test results and reports'),
  ('Imaging', 'X-rays, MRIs, and other imaging results'),
  ('Vaccination Records', 'Vaccination history and certificates'),
  ('Consent Forms', 'Medical consent and authorization forms'),
  ('Other', 'Other medical documents'); 