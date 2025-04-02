-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create function to execute SQL from client
-- This is only for the migration script and should be used with caution
CREATE OR REPLACE FUNCTION exec_sql(sql_string text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with the privileges of the function creator
AS $$
BEGIN
  EXECUTE sql_string;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;
GRANT EXECUTE ON FUNCTION exec_sql(text) TO anon;
GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role; 