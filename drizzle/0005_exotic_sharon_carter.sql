CREATE TABLE "organization_packages" (
	"organization_id" uuid NOT NULL,
	"package_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_packages_organization_id_package_id_pk" PRIMARY KEY("organization_id","package_id")
);
--> statement-breakpoint
ALTER TABLE "organization_packages" ADD CONSTRAINT "organization_packages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_packages" ADD CONSTRAINT "organization_packages_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;