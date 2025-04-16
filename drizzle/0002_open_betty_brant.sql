-- STEP 1 (Run Separately First): Add 'not_started' to benefit_status if it exists
-- ALTER TYPE benefit_status ADD VALUE IF NOT EXISTS 'not_started';
-- END OF STEP 1

-- STEP 2 (Run this part after Step 1 completes)
CREATE TYPE "public"."appointment_status" AS ENUM('scheduled', 'completed', 'cancelled', 'pending', 'confirmed');--> statement-breakpoint
CREATE TYPE "public"."benefit_source" AS ENUM('employer_or_plan', 'partner_or_parent', 'none');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('pending', 'success', 'failed'); --> Added this type
-- CREATE TYPE IF NOT EXISTS "public"."benefit_status" AS ENUM('not_started', 'pending_verification', 'verified', 'declined', 'no_benefit'); -- Handled by Step 1 or assumed exists
-- CREATE TYPE IF NOT EXISTS "public"."package_tier" AS ENUM('basic', 'silver', 'gold', 'platinum'); -- Assume exists
-- CREATE TYPE IF NOT EXISTS "public"."user_role" AS ENUM('admin', 'staff', 'provider', 'patient'); -- Assume exists
--> statement-breakpoint
-- Create tables only if they don't exist
CREATE TABLE IF NOT EXISTS "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"hr_contact_info" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"tier" "package_tier" NOT NULL,
	"monthly_cost" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"description" text,
	"key_benefits" text[],
	"is_base_employer_package" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_benefit_verification_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid,
	"submitted_first_name" text,
	"submitted_last_name" text,
	"submitted_dob" date,
	"submitted_phone" text,
	"submitted_work_email" text,
	"verification_attempt_timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "verification_status" DEFAULT 'pending' NOT NULL,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_patient_id_patient_profiles_id_fk";
--> statement-breakpoint
-- Drop the dependent trigger before altering the column type
DROP TRIGGER IF EXISTS appointment_completion_milestone_trigger ON appointments;
--> statement-breakpoint
-- Drop potential check constraint before altering the column type
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
--> statement-breakpoint
-- Ensure the type exists before altering (using the CREATE TYPE above)
ALTER TABLE "appointments" ALTER COLUMN "status" SET DATA TYPE appointment_status USING "status"::text::appointment_status;
--> statement-breakpoint
ALTER TABLE "patient_profiles" ALTER COLUMN "user_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "patient_profiles" ALTER COLUMN "first_name" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "patient_profiles" ALTER COLUMN "last_name" DROP NOT NULL;
--> statement-breakpoint
-- benefit_status ADD VALUE was done in Step 1
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "benefit_source" "benefit_source" DEFAULT 'none';
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "sponsoring_organization_id" uuid;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "benefit_status" "benefit_status" DEFAULT 'not_started';
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "selected_package_id" uuid;
--> statement-breakpoint
-- Delete orphan appointments before adding the new FK constraint
DELETE FROM appointments WHERE patient_id NOT IN (SELECT id FROM users);
--> statement-breakpoint
ALTER TABLE "user_benefit_verification_attempts" ADD CONSTRAINT "user_benefit_verification_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_benefit_verification_attempts" ADD CONSTRAINT "user_benefit_verification_attempts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_sponsoring_organization_id_organizations_id_fk" FOREIGN KEY ("sponsoring_organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_selected_package_id_packages_id_fk" FOREIGN KEY ("selected_package_id") REFERENCES "public"."packages"("id") ON DELETE set null ON UPDATE no action;