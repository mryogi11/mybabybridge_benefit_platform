ALTER TABLE "appointments" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "message_attachments" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "messages" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "patient_profiles" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "provider_time_blocks" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "provider_weekly_schedules" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "providers" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_selected_package_id_fkey";
--> statement-breakpoint
ALTER TABLE "organization_packages" DROP CONSTRAINT "organization_packages_organization_id_fkey";
--> statement-breakpoint
ALTER TABLE "organization_packages" DROP CONSTRAINT "organization_packages_package_id_fkey";
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "benefit_status" SET DATA TYPE benefit_status;--> statement-breakpoint
ALTER TABLE "organization_approved_emails" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "user_benefit_verification_attempts" ADD CONSTRAINT "user_benefit_verification_attempts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_approved_emails" ADD CONSTRAINT "organization_approved_emails_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_packages" ADD CONSTRAINT "organization_packages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_profiles" ADD CONSTRAINT "patient_profiles_user_id_unique" UNIQUE("user_id");--> statement-breakpoint
ALTER TABLE "public"."users" ALTER COLUMN "benefit_status" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."benefit_status";--> statement-breakpoint
CREATE TYPE "public"."benefit_status" AS ENUM('not_started', 'pending_verification', 'verified', 'declined', 'no_benefit');--> statement-breakpoint
ALTER TABLE "public"."users" ALTER COLUMN "benefit_status" SET DATA TYPE "public"."benefit_status" USING "benefit_status"::"public"."benefit_status";--> statement-breakpoint
ALTER TABLE "public"."packages" ALTER COLUMN "tier" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."package_tier";--> statement-breakpoint
CREATE TYPE "public"."package_tier" AS ENUM('basic', 'silver', 'gold', 'platinum');--> statement-breakpoint
ALTER TABLE "public"."packages" ALTER COLUMN "tier" SET DATA TYPE "public"."package_tier" USING "tier"::"public"."package_tier";--> statement-breakpoint
DROP POLICY "Admins can view all appointments" ON "appointments" CASCADE;--> statement-breakpoint
DROP POLICY "Patients can insert their own appointments" ON "appointments" CASCADE;--> statement-breakpoint
DROP POLICY "Patients can update their own appointments" ON "appointments" CASCADE;--> statement-breakpoint
DROP POLICY "Patients can view their own appointments" ON "appointments" CASCADE;--> statement-breakpoint
DROP POLICY "Providers can delete their own appointments" ON "appointments" CASCADE;--> statement-breakpoint
DROP POLICY "Providers can insert their own appointments" ON "appointments" CASCADE;--> statement-breakpoint
DROP POLICY "Providers can update their own appointments" ON "appointments" CASCADE;--> statement-breakpoint
DROP POLICY "Providers can view their own appointments" ON "appointments" CASCADE;--> statement-breakpoint
DROP POLICY "Users can insert their own messages" ON "messages" CASCADE;--> statement-breakpoint
DROP POLICY "Users can view their own messages" ON "messages" CASCADE;--> statement-breakpoint
DROP POLICY "Admins can view all patient profiles" ON "patient_profiles" CASCADE;--> statement-breakpoint
DROP POLICY "Patients can update their own profile" ON "patient_profiles" CASCADE;--> statement-breakpoint
DROP POLICY "Patients can insert their own profile" ON "patient_profiles" CASCADE;--> statement-breakpoint
DROP POLICY "Patients can view their own profile" ON "patient_profiles" CASCADE;--> statement-breakpoint
DROP POLICY "Providers can view profiles of their patients" ON "patient_profiles" CASCADE;--> statement-breakpoint
DROP POLICY "Providers can manage their own time blocks" ON "provider_time_blocks" CASCADE;--> statement-breakpoint
DROP POLICY "Allow authenticated read access to providers" ON "providers" CASCADE;--> statement-breakpoint
DROP POLICY "Users can update their own provider record" ON "providers" CASCADE;--> statement-breakpoint
DROP POLICY "Users can view their own provider record" ON "providers" CASCADE;--> statement-breakpoint
DROP POLICY "Allow authenticated read access to weekly schedules" ON "provider_weekly_schedules" CASCADE;--> statement-breakpoint
DROP POLICY "Providers can manage their own weekly schedules" ON "provider_weekly_schedules" CASCADE;--> statement-breakpoint
DROP POLICY "Allow admins to update user roles" ON "users" CASCADE;--> statement-breakpoint
DROP POLICY "Allow users to read their own data" ON "users" CASCADE;--> statement-breakpoint
DROP POLICY "Allow users to update their own data" ON "users" CASCADE;--> statement-breakpoint
DROP POLICY "Allow users with admin role to read all users" ON "users" CASCADE;--> statement-breakpoint
DROP POLICY "Users can view their own data" ON "users" CASCADE;--> statement-breakpoint
DROP POLICY "Users can insert attachments for their messages" ON "message_attachments" CASCADE;--> statement-breakpoint
DROP POLICY "Users can view attachments for their messages" ON "message_attachments" CASCADE;--> statement-breakpoint
DROP TYPE "public"."package_status";--> statement-breakpoint
DROP TYPE "public"."purchase_type";--> statement-breakpoint
DROP TYPE "public"."treatment_milestone";--> statement-breakpoint
DROP TYPE "public"."treatment_status";