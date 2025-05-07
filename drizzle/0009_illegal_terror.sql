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
ALTER TABLE "organizations" DROP CONSTRAINT IF EXISTS "organizations_domain_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "organization_approved_emails_org_email_uq";--> statement-breakpoint
ALTER TABLE "organization_approved_emails" DROP CONSTRAINT IF EXISTS "organization_approved_emails_pkey";--> statement-breakpoint
ALTER TABLE "organization_approved_emails" DROP CONSTRAINT IF EXISTS "organization_approved_emails_organization_id_email_pk";--> statement-breakpoint
ALTER TABLE "organization_approved_emails" ADD CONSTRAINT "organization_approved_emails_organization_id_email_pk" PRIMARY KEY("organization_id","email");--> statement-breakpoint
ALTER TABLE "organization_packages" DROP CONSTRAINT IF EXISTS "organization_packages_pkey";--> statement-breakpoint
ALTER TABLE "organization_packages" DROP CONSTRAINT IF EXISTS "organization_packages_organization_id_package_id_pk";--> statement-breakpoint
ALTER TABLE "organization_packages" ADD CONSTRAINT "organization_packages_organization_id_package_id_pk" PRIMARY KEY("organization_id","package_id");--> statement-breakpoint
ALTER TABLE "organization_packages" ADD COLUMN IF NOT EXISTS "package_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "selected_package_id" uuid;--> statement-breakpoint
ALTER TABLE "organization_packages" DROP CONSTRAINT IF EXISTS "organization_packages_package_id_packages_id_fk";--> statement-breakpoint
ALTER TABLE "organization_packages" ADD CONSTRAINT "organization_packages_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_selected_package_id_packages_id_fk";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_selected_package_id_packages_id_fk" FOREIGN KEY ("selected_package_id") REFERENCES "public"."packages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_packages" DROP COLUMN IF EXISTS "id";--> statement-breakpoint
ALTER TABLE "organization_packages" DROP COLUMN IF EXISTS "name";--> statement-breakpoint
ALTER TABLE "organization_packages" DROP COLUMN IF EXISTS "description";--> statement-breakpoint
ALTER TABLE "organization_packages" DROP COLUMN IF EXISTS "monthly_price";--> statement-breakpoint
ALTER TABLE "organization_packages" DROP COLUMN IF EXISTS "features";--> statement-breakpoint
ALTER TABLE "organization_packages" DROP COLUMN IF EXISTS "currency";--> statement-breakpoint
ALTER TABLE "organization_packages" DROP COLUMN IF EXISTS "stripe_product_id";--> statement-breakpoint
ALTER TABLE "organization_packages" DROP COLUMN IF EXISTS "stripe_price_id";--> statement-breakpoint
ALTER TABLE "organization_packages" DROP COLUMN IF EXISTS "is_active";--> statement-breakpoint
ALTER TABLE "organization_packages" DROP COLUMN IF EXISTS "updated_at";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "package_status";--> statement-breakpoint
ALTER TABLE "providers" DROP CONSTRAINT IF EXISTS "providers_user_id_unique";--> statement-breakpoint
ALTER TABLE "providers" ADD CONSTRAINT "providers_user_id_unique" UNIQUE("user_id");--> statement-breakpoint
DROP TYPE IF EXISTS "public"."user_package_status";