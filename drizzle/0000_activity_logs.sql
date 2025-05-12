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