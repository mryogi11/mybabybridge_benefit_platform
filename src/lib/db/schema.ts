import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  primaryKey,
  time,
  date,
  pgEnum,
  jsonb,
  decimal
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
// import { AppointmentStatus } from '@/lib/types'; // Commented out as AppointmentStatus type might not be defined yet or needed here

// --- Enums ---
export const userRoleEnum = pgEnum('user_role', ['admin', 'staff', 'provider', 'patient']);
export const benefitSourceEnum = pgEnum('benefit_source', ['employer_or_plan', 'partner_or_parent', 'none']);
export const benefitStatusEnum = pgEnum('benefit_status', ['not_started', 'pending_verification', 'verified', 'declined', 'no_benefit']);
export const packageTierEnum = pgEnum('package_tier', ['basic', 'silver', 'gold', 'platinum']); // Based on BENEFIT_MODULE_GUIDE
export const appointmentStatusEnum = pgEnum('appointment_status', ['scheduled', 'completed', 'cancelled', 'pending', 'confirmed']); // Defined based on existing appointments table

// --- Organizations Table ---
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  domain: text('domain'), // For work email verification
  // benefit_tier_offered_id: uuid('benefit_tier_offered_id').references(() => packages.id), // Link to the default package offered
  hr_contact_info: text('hr_contact_info'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Packages Table ---
export const packages = pgTable('packages', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  tier: packageTierEnum('tier').notNull(), // Basic, Silver, Gold, Platinum
  monthly_cost: decimal('monthly_cost', { precision: 10, scale: 2 }).notNull().default('0.00'), // Monthly cost for upgrades
  description: text('description'),
  key_benefits: text('key_benefits').array(), // List of key benefits
  is_base_employer_package: boolean('is_base_employer_package').default(false).notNull(), // Is this the default employer package?
  // included_services: jsonb('included_services'), // More structured way to store included services?
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Add FK constraint for organizations.benefit_tier_offered_id after packages table is defined
// This requires raw SQL or a multi-step migration approach if using drizzle-kit directly
// Alternatively, make it nullable or handle the relation logic in the application layer initially.
// For now, let's keep it commented out in the organizations table definition.

// --- NEW: Organization Approved Emails Table ---
export const organization_approved_emails = pgTable('organization_approved_emails', {
  id: uuid('id').primaryKey().defaultRandom(),
  organization_id: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  email: text('email').notNull(), // The approved email address
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  // Add unique constraint for org_id + email?
}, (table) => {
    return {
        orgEmailUnique: primaryKey({ columns: [table.organization_id, table.email] }) // Make org_id + email unique
    };
});

// --- Users Table (Mirroring Supabase migration - linked to auth.users) ---
// Note: Drizzle cannot directly reference auth.users. We assume this table
// mirrors essential user data and links via the UUID.
// You might need custom SQL or triggers in migrations if syncing is needed.
export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // References auth.users(id)
  email: text('email').notNull().unique(),
  // Add real name fields (collected during verification)
  first_name: text('first_name'), // Made nullable for existing users
  last_name: text('last_name'),   // Made nullable for existing users
  // Add address fields (collected during verification)
  address_line1: text('address_line1'),
  address_line2: text('address_line2'), // Optional
  address_city: text('address_city'),
  address_state: text('address_state'), // Or province
  address_postal_code: text('address_postal_code'),
  address_country: text('address_country'), // Use ISO codes ideally

  // Add other columns if they exist in your public.users table from migrations
  role: userRoleEnum('role').notNull().default('patient'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),

  // Benefit Module Fields
  benefit_source: benefitSourceEnum('benefit_source').default('none'),
  sponsoring_organization_id: uuid('sponsoring_organization_id').references(() => organizations.id, { onDelete: 'set null' }), // Link to the sponsoring org
  benefit_status: benefitStatusEnum('benefit_status').default('not_started'),
  selected_package_id: uuid('selected_package_id').references(() => packages.id, { onDelete: 'set null' }), // Link to the chosen package (base or upgrade)
  
  // Stripe Customer ID
  stripe_customer_id: text('stripe_customer_id').unique(), // Add unique constraint
});

// --- User Benefit Verification Attempts Table ---
export const user_benefit_verification_attempts = pgTable('user_benefit_verification_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  organization_id: uuid('organization_id').references(() => organizations.id, { onDelete: 'set null' }), // Org searched/selected during attempt
  submitted_first_name: text('submitted_first_name'),
  submitted_last_name: text('submitted_last_name'),
  submitted_dob: date('submitted_dob'),
  submitted_phone: text('submitted_phone'),
  submitted_work_email: text('submitted_work_email'),
  verification_attempt_timestamp: timestamp('verification_attempt_timestamp', { withTimezone: true }).defaultNow().notNull(),
  status: pgEnum('verification_status', ['pending', 'success', 'failed'])('status').notNull().default('pending'),
  failure_reason: text('failure_reason'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Patient Profiles Table (Mirroring Supabase migration) ---
export const patient_profiles = pgTable('patient_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(), // Ensure FK is not null
  first_name: text('first_name'), // Made nullable based on verification flow needing these later
  last_name: text('last_name'), // Made nullable
  email: text('email'),
  phone: text('phone'), // Nullable
  date_of_birth: date('date_of_birth'), // Nullable
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zip_code: text('zip_code'),
  insurance_provider: text('insurance_provider'),
  insurance_id: text('insurance_id'),
  blood_type: text('blood_type'),
  allergies: text('allergies'),
  medications: text('medications'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});


// --- Providers Table (Mirroring Supabase migration) ---
export const providers = pgTable('providers', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id') // FK to auth.users(id) in migration - linking to public.users here
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  specialization: text('specialization'),
  bio: text('bio'),
  experience_years: integer('experience_years'),
  education: text('education').array(), // Correct way to define text array
  certifications: text('certifications').array(), // Correct way to define text array
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  // slotDuration removed as it wasn't in the migration
});

// --- Provider Weekly Schedules Table (Was workingHours) ---
export const provider_weekly_schedules = pgTable(
  'provider_weekly_schedules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    provider_id: uuid('provider_id')
      .references(() => providers.id, { onDelete: 'cascade' })
      .notNull(),
    day_of_week: integer('day_of_week').notNull(), // 0-6
    start_time: time('start_time', { withTimezone: false }).notNull(), // TIME WITHOUT TIME ZONE
    end_time: time('end_time', { withTimezone: false }).notNull(), // TIME WITHOUT TIME ZONE
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  }
);
// export type WorkingHour = typeof provider_weekly_schedules.$inferSelect; // Renamed type export if needed elsewhere

// --- Provider Time Blocks Table ---
 export const provider_time_blocks = pgTable('provider_time_blocks', {
   id: uuid('id').primaryKey().defaultRandom(),
   provider_id: uuid('provider_id')
      .references(() => providers.id, { onDelete: 'cascade' })
      .notNull(),
   start_datetime: timestamp('start_datetime', { withTimezone: true }).notNull(),
   end_datetime: timestamp('end_datetime', { withTimezone: true }).notNull(),
   reason: text('reason'),
   is_unavailable: boolean('is_unavailable').default(true).notNull(),
   created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
   // updated_at missing from migration, add if needed
 });


// --- Appointments Table (Mirroring Supabase migration) ---
export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  patient_id: uuid('patient_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  provider_id: uuid('provider_id')
    .references(() => providers.id, { onDelete: 'cascade' })
    .notNull(),
  appointment_date: timestamp('appointment_date', { withTimezone: true }).notNull(), // Renamed from startTime, matches migration
  status: appointmentStatusEnum('status')
    .notNull(), // Default handled by app/trigger?
    // .default('pending') - Migration doesn't specify default
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  duration: integer('duration'), // Nullable based on migration
  type: text('type'), // Nullable based on migration
  // startTime removed as it wasn't in the migration
});

// --- Provider Availability Table (Placeholder - remove if not needed or merge with weekly_schedules/time_blocks) ---
// This seems redundant given provider_weekly_schedules and provider_time_blocks
/*
export const providerAvailabilities = pgTable('provider_availabilities', {
   id: uuid('id').primaryKey().defaultRandom(),
   providerId: uuid('provider_id').references(() => providers.id),
   // ... other fields like day_of_week, start_time, end_time
 });
*/

// --- Relations ---
// Define relations based on the corrected table names and foreign keys
export const organizationsRelations = relations(organizations, ({ many }) => ({
  sponsoredUsers: many(users),
  approvedEmails: many(organization_approved_emails), // Add relation to approved emails
  // relation to default package if FK is added later
}));

export const packagesRelations = relations(packages, ({ many }) => ({
  selectedByUsers: many(users),
  // relation from organizations default package if FK is added later
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  providerProfile: one(providers, { // Relation from user to provider profile
    fields: [users.id],
    references: [providers.user_id],
  }),
  patientProfile: one(patient_profiles, { // Relation from user to patient profile
    fields: [users.id],
    references: [patient_profiles.user_id],
  }),
  appointments: many(appointments), // User (as patient) can have many appointments
  benefitVerificationAttempts: many(user_benefit_verification_attempts),
  sponsoringOrganization: one(organizations, {
    fields: [users.sponsoring_organization_id],
    references: [organizations.id],
  }),
  selectedPackage: one(packages, {
    fields: [users.selected_package_id],
    references: [packages.id],
  }),
}));

export const userBenefitVerificationAttemptsRelations = relations(user_benefit_verification_attempts, ({ one }) => ({
  user: one(users, {
    fields: [user_benefit_verification_attempts.user_id],
    references: [users.id],
  }),
  organization: one(organizations, { // Keep relation to the organization attempted
    fields: [user_benefit_verification_attempts.organization_id],
    references: [organizations.id],
  }),
}));

export const patientProfilesRelations = relations(patient_profiles, ({ one, many }) => ({
  user: one(users, {
    fields: [patient_profiles.user_id],
    references: [users.id],
  }),
  // appointments relation removed - appointments link directly to users now
}));

export const providersRelations = relations(providers, ({ one, many }) => ({
  user: one(users, {
    fields: [providers.user_id],
    references: [users.id],
  }),
  weeklySchedules: many(provider_weekly_schedules), // Renamed relation
  timeBlocks: many(provider_time_blocks), // Added relation
  appointments: many(appointments),
  // availabilities: many(providerAvailabilities), // Removed potentially redundant relation
}));

export const providerWeeklySchedulesRelations = relations(provider_weekly_schedules, ({ one }) => ({
  provider: one(providers, {
    fields: [provider_weekly_schedules.provider_id],
    references: [providers.id],
  }),
}));

export const providerTimeBlocksRelations = relations(provider_time_blocks, ({ one }) => ({
  provider: one(providers, {
    fields: [provider_time_blocks.provider_id],
    references: [providers.id],
  }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  provider: one(providers, {
    fields: [appointments.provider_id],
    references: [providers.id],
  }),
  patient: one(users, { // Changed to reference users table directly
    fields: [appointments.patient_id],
    references: [users.id],
  }),
}));

// Remove relations for providerAvailabilities if table is removed
/*
export const providerAvailabilitiesRelations = relations(providerAvailabilities, ({ one }) => ({
   provider: one(providers, {
     fields: [providerAvailabilities.providerId],
     references: [providers.id],
   }),
 }));
*/

// Note: You might need a patient_profiles table as well, based on bookAppointment logic.
// Define it similarly if required.

// --- NEW: Relation for Approved Emails ---
export const organizationApprovedEmailsRelations = relations(organization_approved_emails, ({ one }) => ({
    organization: one(organizations, {
        fields: [organization_approved_emails.organization_id],
        references: [organizations.id],
    }),
})); 