-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."appointment_status" AS ENUM('scheduled', 'completed', 'cancelled', 'pending', 'confirmed');--> statement-breakpoint
CREATE TYPE "public"."benefit_source" AS ENUM('employer_or_plan', 'partner_or_parent', 'none');--> statement-breakpoint
CREATE TYPE "public"."benefit_status" AS ENUM('pending_verification', 'verified', 'declined', 'not_applicable', 'not_started');--> statement-breakpoint
CREATE TYPE "public"."package_status" AS ENUM('purchased', 'active', 'expired', 'completed');--> statement-breakpoint
CREATE TYPE "public"."package_tier" AS ENUM('basic', 'premium', 'custom', 'silver', 'gold', 'platinum');--> statement-breakpoint
CREATE TYPE "public"."purchase_type" AS ENUM('subscription', 'one-time');--> statement-breakpoint
CREATE TYPE "public"."theme_mode" AS ENUM('light', 'dark', 'system');--> statement-breakpoint
CREATE TYPE "public"."treatment_milestone" AS ENUM('patient_details', 'initial_consultation', 'treatment_phase', 'prenatal_care');--> statement-breakpoint
CREATE TYPE "public"."treatment_status" AS ENUM('pending', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'staff', 'provider', 'patient');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('pending', 'success', 'failed');--> statement-breakpoint
CREATE TABLE "packages" (
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
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"appointment_date" timestamp with time zone NOT NULL,
	"status" "appointment_status" NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"duration" integer,
	"type" text
);
--> statement-breakpoint
ALTER TABLE "appointments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" uuid,
	"receiver_id" uuid,
	"content" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"thread_id" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "patient_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"first_name" text,
	"last_name" text,
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
ALTER TABLE "patient_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"domain" text,
	"hr_contact_info" text
);
--> statement-breakpoint
CREATE TABLE "provider_time_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"start_datetime" timestamp with time zone NOT NULL,
	"end_datetime" timestamp with time zone NOT NULL,
	"reason" text,
	"is_unavailable" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "provider_time_blocks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"specialization" text,
	"bio" text,
	"experience_years" integer,
	"education" text[],
	"certifications" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "providers_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "providers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
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
ALTER TABLE "provider_weekly_schedules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"role" "user_role" DEFAULT 'patient' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"benefit_source" "benefit_source" DEFAULT 'none',
	"sponsoring_organization_id" uuid,
	"benefit_status" text DEFAULT 'not_started',
	"stripe_customer_id" text,
	"first_name" text,
	"last_name" text,
	"address_line1" text,
	"address_line2" text,
	"address_city" text,
	"address_state" text,
	"address_postal_code" text,
	"address_country" text,
	"theme_preference" "theme_mode" DEFAULT 'dark',
	"selected_package_id" uuid,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_stripe_customer_id_unique" UNIQUE("stripe_customer_id")
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_benefit_verification_attempts" (
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
CREATE TABLE "organization_approved_emails" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_organization_email" UNIQUE("organization_id","email")
);
--> statement-breakpoint
CREATE TABLE "message_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"file_name" text,
	"file_url" text NOT NULL,
	"file_type" text,
	"file_size" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "message_attachments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "organization_packages" (
	"organization_id" uuid NOT NULL,
	"package_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_packages_organization_id_package_id_pk" PRIMARY KEY("organization_id","package_id")
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_profiles" ADD CONSTRAINT "patient_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_time_blocks" ADD CONSTRAINT "provider_time_blocks_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "providers" ADD CONSTRAINT "providers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_weekly_schedules" ADD CONSTRAINT "provider_weekly_schedules_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_selected_package_id_fkey" FOREIGN KEY ("selected_package_id") REFERENCES "public"."packages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_selected_package_id_packages_id_fk" FOREIGN KEY ("selected_package_id") REFERENCES "public"."packages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_sponsoring_organization_id_organizations_id_fk" FOREIGN KEY ("sponsoring_organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_benefit_verification_attempts" ADD CONSTRAINT "user_benefit_verification_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_packages" ADD CONSTRAINT "organization_packages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_packages" ADD CONSTRAINT "organization_packages_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_packages" ADD CONSTRAINT "organization_packages_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "Admins can view all appointments" ON "appointments" AS PERMISSIVE FOR SELECT TO public USING (((auth.role() = 'authenticated'::text) AND is_admin(auth.uid())));--> statement-breakpoint
CREATE POLICY "Patients can insert their own appointments" ON "appointments" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "Patients can update their own appointments" ON "appointments" AS PERMISSIVE FOR UPDATE TO "authenticated";--> statement-breakpoint
CREATE POLICY "Patients can view their own appointments" ON "appointments" AS PERMISSIVE FOR SELECT TO "authenticated";--> statement-breakpoint
CREATE POLICY "Providers can delete their own appointments" ON "appointments" AS PERMISSIVE FOR DELETE TO public;--> statement-breakpoint
CREATE POLICY "Providers can insert their own appointments" ON "appointments" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "Providers can update their own appointments" ON "appointments" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Providers can view their own appointments" ON "appointments" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Users can insert their own messages" ON "messages" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = sender_id));--> statement-breakpoint
CREATE POLICY "Users can view their own messages" ON "messages" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Admins can view all patient profiles" ON "patient_profiles" AS PERMISSIVE FOR SELECT TO public USING (((auth.role() = 'authenticated'::text) AND is_admin(auth.uid())));--> statement-breakpoint
CREATE POLICY "Patients can update their own profile" ON "patient_profiles" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Patients can insert their own profile" ON "patient_profiles" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "Patients can view their own profile" ON "patient_profiles" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Providers can view profiles of their patients" ON "patient_profiles" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Providers can manage their own time blocks" ON "provider_time_blocks" AS PERMISSIVE FOR ALL TO public USING ((( SELECT p.user_id
   FROM providers p
  WHERE (p.id = provider_time_blocks.provider_id)) = auth.uid())) WITH CHECK ((( SELECT p.user_id
   FROM providers p
  WHERE (p.id = provider_time_blocks.provider_id)) = auth.uid()));--> statement-breakpoint
CREATE POLICY "Allow authenticated read access to providers" ON "providers" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "Users can update their own provider record" ON "providers" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Users can view their own provider record" ON "providers" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Allow authenticated read access to weekly schedules" ON "provider_weekly_schedules" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "Providers can manage their own weekly schedules" ON "provider_weekly_schedules" AS PERMISSIVE FOR ALL TO "authenticated";--> statement-breakpoint
CREATE POLICY "Allow admins to update user roles" ON "users" AS PERMISSIVE FOR UPDATE TO public USING (is_admin());--> statement-breakpoint
CREATE POLICY "Allow users to read their own data" ON "users" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Allow users to update their own data" ON "users" AS PERMISSIVE FOR UPDATE TO "authenticated";--> statement-breakpoint
CREATE POLICY "Allow users with admin role to read all users" ON "users" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Users can view their own data" ON "users" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Users can insert attachments for their messages" ON "message_attachments" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM messages
  WHERE ((messages.id = message_attachments.message_id) AND (messages.sender_id = auth.uid())))));--> statement-breakpoint
CREATE POLICY "Users can view attachments for their messages" ON "message_attachments" AS PERMISSIVE FOR SELECT TO public;
*/