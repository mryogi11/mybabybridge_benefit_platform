CREATE TYPE "public"."treatment_milestone_status" AS ENUM('pending', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "treatment_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"treatment_plan_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"due_date" timestamp with time zone,
	"status" "treatment_milestone_status" DEFAULT 'pending' NOT NULL,
	"appointment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treatment_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid,
	"user_email" text,
	"action_type" text NOT NULL,
	"target_entity_type" text,
	"target_entity_id" text,
	"details" jsonb,
	"status" text,
	"ip_address" text,
	"description" text
);
--> statement-breakpoint
ALTER TABLE "treatment_milestones" ADD CONSTRAINT "treatment_milestones_treatment_plan_id_treatment_plans_id_fk" FOREIGN KEY ("treatment_plan_id") REFERENCES "public"."treatment_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_milestones" ADD CONSTRAINT "treatment_milestones_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;