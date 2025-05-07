ALTER TABLE "packages" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "packages" CASCADE;--> statement-breakpoint
ALTER TABLE "organization_packages" DROP CONSTRAINT "organization_packages_package_id_packages_id_fk";
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_selected_package_id_packages_id_fk";
--> statement-breakpoint
ALTER TABLE "organization_packages" DROP CONSTRAINT "organization_packages_organization_id_package_id_pk";--> statement-breakpoint
ALTER TABLE "organization_packages" ADD COLUMN "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_packages" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_packages" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "organization_packages" ADD COLUMN "monthly_price" numeric(10, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_packages" ADD COLUMN "features" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_packages" ADD COLUMN "currency" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_packages" ADD COLUMN "stripe_product_id" text;--> statement-breakpoint
ALTER TABLE "organization_packages" ADD COLUMN "stripe_price_id" text;--> statement-breakpoint
ALTER TABLE "organization_packages" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_packages" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_packages" DROP COLUMN "package_id";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "selected_package_id";--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_domain_unique" UNIQUE("domain");