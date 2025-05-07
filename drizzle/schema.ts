import { pgTable, uuid, text, numeric, boolean, timestamp, foreignKey, pgPolicy, integer, date, unique, time, primaryKey, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const appointmentStatus = pgEnum("appointment_status", ['scheduled', 'completed', 'cancelled', 'pending', 'confirmed'])
export const benefitSource = pgEnum("benefit_source", ['employer_or_plan', 'partner_or_parent', 'none'])
export const benefitStatus = pgEnum("benefit_status", ['pending_verification', 'verified', 'declined', 'not_applicable', 'not_started'])
export const packageStatus = pgEnum("package_status", ['purchased', 'active', 'expired', 'completed'])
export const packageTier = pgEnum("package_tier", ['basic', 'premium', 'custom', 'silver', 'gold', 'platinum'])
export const purchaseType = pgEnum("purchase_type", ['subscription', 'one-time'])
export const themeMode = pgEnum("theme_mode", ['light', 'dark', 'system'])
export const treatmentMilestone = pgEnum("treatment_milestone", ['patient_details', 'initial_consultation', 'treatment_phase', 'prenatal_care'])
export const treatmentStatus = pgEnum("treatment_status", ['pending', 'in_progress', 'completed'])
export const userRole = pgEnum("user_role", ['admin', 'staff', 'provider', 'patient'])
export const verificationStatus = pgEnum("verification_status", ['pending', 'success', 'failed'])


export const packages = pgTable("packages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	tier: packageTier().notNull(),
	monthlyCost: numeric("monthly_cost", { precision: 10, scale:  2 }).default('0.00').notNull(),
	description: text(),
	keyBenefits: text("key_benefits").array(),
	isBaseEmployerPackage: boolean("is_base_employer_package").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const appointments = pgTable("appointments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	providerId: uuid("provider_id").notNull(),
	patientId: uuid("patient_id").notNull(),
	appointmentDate: timestamp("appointment_date", { withTimezone: true, mode: 'string' }).notNull(),
	status: appointmentStatus().notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	duration: integer(),
	type: text(),
}, (table) => [
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [users.id],
			name: "appointments_patient_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.providerId],
			foreignColumns: [providers.id],
			name: "appointments_provider_id_providers_id_fk"
		}).onDelete("cascade"),
	pgPolicy("Admins can view all appointments", { as: "permissive", for: "select", to: ["public"], using: sql`((auth.role() = 'authenticated'::text) AND is_admin(auth.uid()))` }),
	pgPolicy("Patients can insert their own appointments", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Patients can update their own appointments", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("Patients can view their own appointments", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("Providers can delete their own appointments", { as: "permissive", for: "delete", to: ["public"] }),
	pgPolicy("Providers can insert their own appointments", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Providers can update their own appointments", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Providers can view their own appointments", { as: "permissive", for: "select", to: ["public"] }),
]);

export const messages = pgTable("messages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	senderId: uuid("sender_id"),
	receiverId: uuid("receiver_id"),
	content: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	threadId: text("thread_id").notNull(),
	isRead: boolean("is_read").default(false).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.receiverId],
			foreignColumns: [users.id],
			name: "messages_receiver_id_users_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.senderId],
			foreignColumns: [users.id],
			name: "messages_sender_id_users_id_fk"
		}).onDelete("set null"),
	pgPolicy("Users can insert their own messages", { as: "permissive", for: "insert", to: ["public"], withCheck: sql`(auth.uid() = sender_id)`  }),
	pgPolicy("Users can view their own messages", { as: "permissive", for: "select", to: ["public"] }),
]);

export const patientProfiles = pgTable("patient_profiles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	email: text(),
	phone: text(),
	dateOfBirth: date("date_of_birth"),
	address: text(),
	city: text(),
	state: text(),
	zipCode: text("zip_code"),
	insuranceProvider: text("insurance_provider"),
	insuranceId: text("insurance_id"),
	bloodType: text("blood_type"),
	allergies: text(),
	medications: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "patient_profiles_user_id_users_id_fk"
		}).onDelete("cascade"),
	pgPolicy("Admins can view all patient profiles", { as: "permissive", for: "select", to: ["public"], using: sql`((auth.role() = 'authenticated'::text) AND is_admin(auth.uid()))` }),
	pgPolicy("Patients can update their own profile", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Patients can insert their own profile", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Patients can view their own profile", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("Providers can view profiles of their patients", { as: "permissive", for: "select", to: ["public"] }),
]);

export const organizations = pgTable("organizations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	domain: text(),
	hrContactInfo: text("hr_contact_info"),
});

export const providerTimeBlocks = pgTable("provider_time_blocks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	providerId: uuid("provider_id").notNull(),
	startDatetime: timestamp("start_datetime", { withTimezone: true, mode: 'string' }).notNull(),
	endDatetime: timestamp("end_datetime", { withTimezone: true, mode: 'string' }).notNull(),
	reason: text(),
	isUnavailable: boolean("is_unavailable").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.providerId],
			foreignColumns: [providers.id],
			name: "provider_time_blocks_provider_id_providers_id_fk"
		}).onDelete("cascade"),
	pgPolicy("Providers can manage their own time blocks", { as: "permissive", for: "all", to: ["public"], using: sql`(( SELECT p.user_id
   FROM providers p
  WHERE (p.id = provider_time_blocks.provider_id)) = auth.uid())`, withCheck: sql`(( SELECT p.user_id
   FROM providers p
  WHERE (p.id = provider_time_blocks.provider_id)) = auth.uid())`  }),
]);

export const providers = pgTable("providers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	firstName: text("first_name").notNull(),
	lastName: text("last_name").notNull(),
	specialization: text(),
	bio: text(),
	experienceYears: integer("experience_years"),
	education: text().array(),
	certifications: text().array(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "providers_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("providers_user_id_unique").on(table.userId),
	pgPolicy("Allow authenticated read access to providers", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
	pgPolicy("Users can update their own provider record", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Users can view their own provider record", { as: "permissive", for: "select", to: ["public"] }),
]);

export const providerWeeklySchedules = pgTable("provider_weekly_schedules", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	providerId: uuid("provider_id").notNull(),
	dayOfWeek: integer("day_of_week").notNull(),
	startTime: time("start_time").notNull(),
	endTime: time("end_time").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.providerId],
			foreignColumns: [providers.id],
			name: "provider_weekly_schedules_provider_id_providers_id_fk"
		}).onDelete("cascade"),
	pgPolicy("Allow authenticated read access to weekly schedules", { as: "permissive", for: "select", to: ["authenticated"], using: sql`true` }),
	pgPolicy("Providers can manage their own weekly schedules", { as: "permissive", for: "all", to: ["authenticated"] }),
]);

export const users = pgTable("users", {
	id: uuid().primaryKey().notNull(),
	email: text().notNull(),
	role: userRole().default('patient').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	benefitSource: benefitSource("benefit_source").default('none'),
	sponsoringOrganizationId: uuid("sponsoring_organization_id"),
	benefitStatus: benefitStatus("benefit_status").default('not_started'),
	stripeCustomerId: text("stripe_customer_id"),
	firstName: text("first_name"),
	lastName: text("last_name"),
	addressLine1: text("address_line1"),
	addressLine2: text("address_line2"),
	addressCity: text("address_city"),
	addressState: text("address_state"),
	addressPostalCode: text("address_postal_code"),
	addressCountry: text("address_country"),
	themePreference: themeMode("theme_preference").default('dark'),
	selectedPackageId: uuid("selected_package_id"),
}, (table) => [
	foreignKey({
			columns: [table.selectedPackageId],
			foreignColumns: [packages.id],
			name: "users_selected_package_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.selectedPackageId],
			foreignColumns: [packages.id],
			name: "users_selected_package_id_packages_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.sponsoringOrganizationId],
			foreignColumns: [organizations.id],
			name: "users_sponsoring_organization_id_organizations_id_fk"
		}).onDelete("set null"),
	unique("users_email_unique").on(table.email),
	unique("users_stripe_customer_id_unique").on(table.stripeCustomerId),
	pgPolicy("Allow admins to update user roles", { as: "permissive", for: "update", to: ["public"], using: sql`is_admin()` }),
	pgPolicy("Allow users to read their own data", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("Allow users to update their own data", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("Allow users with admin role to read all users", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("Users can view their own data", { as: "permissive", for: "select", to: ["public"] }),
]);

export const userBenefitVerificationAttempts = pgTable("user_benefit_verification_attempts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	organizationId: uuid("organization_id"),
	submittedFirstName: text("submitted_first_name"),
	submittedLastName: text("submitted_last_name"),
	submittedDob: date("submitted_dob"),
	submittedPhone: text("submitted_phone"),
	submittedWorkEmail: text("submitted_work_email"),
	verificationAttemptTimestamp: timestamp("verification_attempt_timestamp", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	status: verificationStatus().default('pending').notNull(),
	failureReason: text("failure_reason"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_benefit_verification_attempts_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const organizationApprovedEmails = pgTable("organization_approved_emails", {
	id: uuid().defaultRandom().notNull(),
	organizationId: uuid("organization_id").notNull(),
	email: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("uq_organization_email").on(table.organizationId, table.email),
]);

export const messageAttachments = pgTable("message_attachments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	messageId: uuid("message_id").notNull(),
	fileName: text("file_name"),
	fileUrl: text("file_url").notNull(),
	fileType: text("file_type"),
	fileSize: integer("file_size"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.messageId],
			foreignColumns: [messages.id],
			name: "message_attachments_message_id_messages_id_fk"
		}).onDelete("cascade"),
	pgPolicy("Users can insert attachments for their messages", { as: "permissive", for: "insert", to: ["public"], withCheck: sql`(EXISTS ( SELECT 1
   FROM messages
  WHERE ((messages.id = message_attachments.message_id) AND (messages.sender_id = auth.uid()))))`  }),
	pgPolicy("Users can view attachments for their messages", { as: "permissive", for: "select", to: ["public"] }),
]);

export const organizationPackages = pgTable("organization_packages", {
	organizationId: uuid("organization_id").notNull(),
	packageId: uuid("package_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "organization_packages_organization_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.packageId],
			foreignColumns: [packages.id],
			name: "organization_packages_package_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.packageId],
			foreignColumns: [packages.id],
			name: "organization_packages_package_id_packages_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.organizationId, table.packageId], name: "organization_packages_organization_id_package_id_pk"}),
]);
