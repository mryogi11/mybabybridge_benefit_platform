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
ALTER TABLE "organizations" DROP CONSTRAINT "organizations_domain_unique";--> statement-breakpoint
DROP INDEX "organization_approved_emails_org_email_uq";--> statement-breakpoint
ALTER TABLE "organization_approved_emails" ADD CONSTRAINT "organization_approved_emails_organization_id_email_pk" PRIMARY KEY("organization_id","email");--> statement-breakpoint
ALTER TABLE "organization_packages" ADD CONSTRAINT "organization_packages_organization_id_package_id_pk" PRIMARY KEY("organization_id","package_id");--> statement-breakpoint
ALTER TABLE "organization_packages" ADD COLUMN "package_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "selected_package_id" uuid;--> statement-breakpoint
ALTER TABLE "organization_packages" ADD CONSTRAINT "organization_packages_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_selected_package_id_packages_id_fk" FOREIGN KEY ("selected_package_id") REFERENCES "public"."packages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_packages" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "organization_packages" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "organization_packages" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "organization_packages" DROP COLUMN "monthly_price";--> statement-breakpoint
ALTER TABLE "organization_packages" DROP COLUMN "features";--> statement-breakpoint
ALTER TABLE "organization_packages" DROP COLUMN "currency";--> statement-breakpoint
ALTER TABLE "organization_packages" DROP COLUMN "stripe_product_id";--> statement-breakpoint
ALTER TABLE "organization_packages" DROP COLUMN "stripe_price_id";--> statement-breakpoint
ALTER TABLE "organization_packages" DROP COLUMN "is_active";--> statement-breakpoint
ALTER TABLE "organization_packages" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "package_status";--> statement-breakpoint
ALTER TABLE "providers" ADD CONSTRAINT "providers_user_id_unique" UNIQUE("user_id");--> statement-breakpoint
DROP TYPE "public"."user_package_status";