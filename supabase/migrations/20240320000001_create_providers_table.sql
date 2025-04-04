-- supabase/migrations/20240320000000a_create_providers_table.sql

CREATE TABLE IF NOT EXISTS public.providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- Assuming standard UUID generation
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Link to auth user
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    specialization TEXT,
    bio TEXT,
    experience_years INTEGER,
    education TEXT[], -- Assuming text array
    certifications TEXT[], -- Assuming text array
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS providers_user_id_idx ON public.providers(user_id);

-- Enable Row Level Security
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Example - adjust as needed)
-- Allow users to view their own provider record
CREATE POLICY "Users can view their own provider record"
    ON public.providers FOR SELECT
    USING (auth.uid() = user_id);

-- Allow users to update their own provider record
CREATE POLICY "Users can update their own provider record"
    ON public.providers FOR UPDATE
    USING (auth.uid() = user_id);

-- Allow admins to manage all provider records (Requires role check, adjust based on your 'users' or 'profiles' table)
-- Example assumes a 'users' table linked to auth.users with a 'role' column
-- Make sure the 'users' table exists before this policy is applied, adjust if using 'profiles' table
-- CREATE POLICY "Admins can manage provider records"
--     ON public.providers FOR ALL
--     USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' ) 
--     WITH CHECK ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' ); 


-- Trigger for updated_at
-- Ensure the function exists (it's likely created in another migration)
-- CREATE OR REPLACE FUNCTION public.handle_updated_at() 
-- RETURNS TRIGGER AS $$
-- BEGIN
--     NEW.updated_at = timezone('utc'::text, now());
--     RETURN NEW;
-- END;
-- $$ language 'plpgsql';

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') AND NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'handle_providers_updated_at' AND tgrelid = 'public.providers'::regclass
    ) THEN
        CREATE TRIGGER handle_providers_updated_at
            BEFORE UPDATE ON public.providers
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END $$; 