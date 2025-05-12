CREATE TYPE "public"."treatment_plan_status" AS ENUM('active', 'completed', 'cancelled');--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD COLUMN "patient_id" uuid;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD COLUMN "provider_id" uuid;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD COLUMN "title" text NOT NULL;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD COLUMN "start_date" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD COLUMN "end_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD COLUMN "status" "treatment_plan_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_provider_id_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;