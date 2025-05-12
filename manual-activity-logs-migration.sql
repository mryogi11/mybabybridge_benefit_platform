-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create the activity_logs table
CREATE TABLE IF NOT EXISTS "activity_logs" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "timestamp" timestamptz NOT NULL DEFAULT now(),
    "user_id" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
    "user_email" text,
    "action_type" text NOT NULL,
    "target_entity_type" text,
    "target_entity_id" text,
    "details" jsonb,
    "status" text,
    "ip_address" text,
    "description" text
);

-- Add RLS policies for activity_logs
ALTER TABLE "activity_logs" ENABLE ROW LEVEL SECURITY;

-- Policy to allow admins to see all logs
CREATE POLICY "admins_can_see_all_logs" ON "activity_logs"
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
    )
);

-- Policy to allow users to see their own logs
CREATE POLICY "users_can_see_own_logs" ON "activity_logs"
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy to allow inserting logs (system level)
CREATE POLICY "service_role_can_insert_logs" ON "activity_logs"
FOR INSERT
TO service_role
WITH CHECK (true);

-- Create index on commonly queried fields
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs("timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);

-- Grant necessary permissions
GRANT SELECT ON "activity_logs" TO authenticated;
GRANT INSERT, SELECT ON "activity_logs" TO service_role; 