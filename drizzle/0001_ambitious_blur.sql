/*
CREATE TABLE "patient_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text,
	"date_of_birth" date,
	"address" text,
	"city" text,
	"state" text,
	"zip_code" text,
	"insurance_provider" text,
	"insurance_id" text,
	"blood_type" text,
	"allergies" text,
	"medications" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
*/

/*
CREATE TABLE "provider_weekly_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
*/

/* The following lines are commented out because the table likely never existed */
/*
ALTER TABLE "provider_availabilities" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
*/
/* Commenting out working_hours alteration as it likely doesn't exist */
/*
ALTER TABLE "working_hours" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
*/
/*
DROP TABLE "provider_availabilities" CASCADE;--> statement-breakpoint
*/
/* Commenting out DROP TABLE as working_hours likely doesn't exist */
/*
DROP TABLE "working_hours" CASCADE;--> statement-breakpoint
*/
/* Commenting out DROP CONSTRAINT as it might not exist or have a different name */
/*
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_provider_id_providers_id_fk";
--> statement-breakpoint
*/
/* Commenting out DROP CONSTRAINT as it might not exist or have a different name */
/*
ALTER TABLE "provider_time_blocks" DROP CONSTRAINT "provider_time_blocks_provider_id_providers_id_fk";
--> statement-breakpoint
*/
ALTER TABLE "appointments" ALTER COLUMN "duration" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "provider_time_blocks" ALTER COLUMN "provider_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "provider_time_blocks" ALTER COLUMN "is_unavailable" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "providers" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "providers" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
-- Commenting out because the column already exists
-- ALTER TABLE "provider_time_blocks" ADD COLUMN "reason" text;--> statement-breakpoint
-- Commenting out because the column already exists
-- ALTER TABLE "provider_time_blocks" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
-- Commenting out because the column likely already exists
-- ALTER TABLE "providers" ADD COLUMN "first_name" text NOT NULL;--> statement-breakpoint
-- Commenting out because the column likely already exists
-- ALTER TABLE "providers" ADD COLUMN "last_name" text NOT NULL;--> statement-breakpoint
-- Commenting out because the column likely already exists
-- ALTER TABLE "providers" ADD COLUMN "experience_years" integer;--> statement-breakpoint
-- Commenting out because the column likely already exists
-- ALTER TABLE "providers" ADD COLUMN "education" text[];--> statement-breakpoint
-- Commenting out because the column likely already exists
-- ALTER TABLE "providers" ADD COLUMN "certifications" text[];--> statement-breakpoint
-- Commenting out because the column likely already exists
-- ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'patient' NOT NULL;--> statement-breakpoint
ALTER TABLE "patient_profiles" ADD CONSTRAINT "patient_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_weekly_schedules" ADD CONSTRAINT "provider_weekly_schedules_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_patient_profiles_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_time_blocks" ADD CONSTRAINT "provider_time_blocks_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Commenting out because the column might not exist
-- ALTER TABLE "appointments" DROP COLUMN "start_time";--> statement-breakpoint
-- Commenting out because the column might not exist
-- ALTER TABLE "providers" DROP COLUMN "slot_duration";--> statement-breakpoint
-- Commenting out because the column might not exist
-- ALTER TABLE "users" DROP COLUMN "first_name";--> statement-breakpoint
-- Commenting out because the column might not exist
-- ALTER TABLE "users" DROP COLUMN "last_name";