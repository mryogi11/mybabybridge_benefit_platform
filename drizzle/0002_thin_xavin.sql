ALTER TABLE "users" DROP CONSTRAINT "users_selected_package_id_packages_id_fk";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "selected_package_id";