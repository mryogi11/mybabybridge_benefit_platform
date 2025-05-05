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
  pgEnum, // Keep pgEnum import
  jsonb,
  decimal
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
// DO NOT import from './enums'

// --- Enums (Defined in this file) ---
export const userRoleEnum = pgEnum('user_role', ['admin', 'staff', 'provider', 'patient']);
export const benefitSourceEnum = pgEnum('benefit_source', ['employer_or_plan', 'partner_or_parent', 'none']);
export const benefitStatusEnum = pgEnum('benefit_status', ['not_started', 'pending_verification', 'verified', 'declined', 'no_benefit']);
export const packageTierEnum = pgEnum('package_tier', ['basic', 'silver', 'gold', 'platinum']);
export const appointmentStatusEnum = pgEnum('appointment_status', ['scheduled', 'completed', 'cancelled', 'pending', 'confirmed']);
export const themeModeEnum = pgEnum('theme_mode', ['light', 'dark', 'system']);
export const verificationStatusEnum = pgEnum('verification_status', ['pending', 'success', 'failed']);

// --- Organizations Table ---
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  domain: text('domain'),
  hr_contact_info: text('hr_contact_info'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Packages Table ---
export const packages = pgTable('packages', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  tier: packageTierEnum('tier').notNull(),
  monthly_cost: decimal('monthly_cost', { precision: 10, scale: 2 }).notNull().default('0.00'),
  description: text('description'),
  key_benefits: text('key_benefits').array(),
  is_base_employer_package: boolean('is_base_employer_package').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Organization Packages Junction Table ---
export const organization_packages = pgTable('organization_packages', {
    organization_id: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
    package_id: uuid('package_id').references(() => packages.id, { onDelete: 'cascade' }).notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.organization_id, table.package_id] }),
    };
  }
);

// --- Organization Approved Emails Table ---
export const organization_approved_emails = pgTable('organization_approved_emails', {
  id: uuid('id').primaryKey().defaultRandom(),
  organization_id: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  email: text('email').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
    return {
        orgEmailUnique: primaryKey({ columns: [table.organization_id, table.email] })
    };
});

// --- Users Table ---
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  first_name: text('first_name'),
  last_name: text('last_name'),
  address_line1: text('address_line1'),
  address_line2: text('address_line2'),
  address_city: text('address_city'),
  address_state: text('address_state'),
  address_postal_code: text('address_postal_code'),
  address_country: text('address_country'),
  role: userRoleEnum('role').notNull().default('patient'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  benefit_source: benefitSourceEnum('benefit_source').default('none'),
  sponsoring_organization_id: uuid('sponsoring_organization_id').references(() => organizations.id, { onDelete: 'set null' }),
  benefit_status: benefitStatusEnum('benefit_status').default('not_started'),
  selected_package_id: uuid('selected_package_id').references(() => packages.id, { onDelete: 'set null' }),
  stripe_customer_id: text('stripe_customer_id').unique(),
  theme_preference: themeModeEnum('theme_preference').default('dark'),
});

// --- User Benefit Verification Attempts Table ---
export const user_benefit_verification_attempts = pgTable('user_benefit_verification_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  organization_id: uuid('organization_id').references(() => organizations.id, { onDelete: 'set null' }),
  submitted_first_name: text('submitted_first_name'),
  submitted_last_name: text('submitted_last_name'),
  submitted_dob: date('submitted_dob'),
  submitted_phone: text('submitted_phone'),
  submitted_work_email: text('submitted_work_email'),
  verification_attempt_timestamp: timestamp('verification_attempt_timestamp', { withTimezone: true }).defaultNow().notNull(),
  status: verificationStatusEnum('status').notNull().default('pending'), // Use locally defined enum
  failure_reason: text('failure_reason'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Patient Profiles Table ---
export const patient_profiles = pgTable('patient_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  first_name: text('first_name'),
  last_name: text('last_name'),
  email: text('email'),
  phone: text('phone'),
  date_of_birth: date('date_of_birth'),
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

// --- Providers Table ---
export const providers = pgTable('providers', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  specialization: text('specialization'),
  bio: text('bio'),
  experience_years: integer('experience_years'),
  education: text('education').array(),
  certifications: text('certifications').array(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Provider Weekly Schedules Table ---
export const provider_weekly_schedules = pgTable(
  'provider_weekly_schedules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    provider_id: uuid('provider_id')
      .references(() => providers.id, { onDelete: 'cascade' })
      .notNull(),
    day_of_week: integer('day_of_week').notNull(),
    start_time: time('start_time', { withTimezone: false }).notNull(),
    end_time: time('end_time', { withTimezone: false }).notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

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
 });


// --- Appointments Table ---
export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  patient_id: uuid('patient_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  provider_id: uuid('provider_id')
    .references(() => providers.id, { onDelete: 'cascade' })
    .notNull(),
  appointment_date: timestamp('appointment_date', { withTimezone: true }).notNull(),
  status: appointmentStatusEnum('status')
    .notNull(),
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  duration: integer('duration'),
  type: text('type'),
});

// --- Messages Table ---
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sender_id: uuid('sender_id').references(() => users.id, { onDelete: 'set null' }),
  receiver_id: uuid('receiver_id').references(() => users.id, { onDelete: 'set null' }),
  content: text('content'),
  thread_id: text('thread_id').notNull(),
  is_read: boolean('is_read').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Message Attachments Table ---
export const message_attachments = pgTable('message_attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  message_id: uuid('message_id').references(() => messages.id, { onDelete: 'cascade' }).notNull(),
  file_url: text('file_url').notNull(),
  file_name: text('file_name'),
  file_type: text('file_type'),
  file_size: integer('file_size'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Relations ---
export const organizationsRelations = relations(organizations, ({ many }) => ({
  sponsoredUsers: many(users),
  approvedEmails: many(organization_approved_emails),
  organizationPackages: many(organization_packages),
}));

export const packagesRelations = relations(packages, ({ many }) => ({
  selectedByUsers: many(users),
  organizationPackages: many(organization_packages),
}));

export const organizationPackagesRelations = relations(organization_packages, ({ one }) => ({
  organization: one(organizations, {
    fields: [organization_packages.organization_id],
    references: [organizations.id],
  }),
  package: one(packages, {
    fields: [organization_packages.package_id],
    references: [packages.id],
  }),
}));

// Single usersRelations declaration with all relations including messages
export const usersRelations = relations(users, ({ one, many }) => ({
  providerProfile: one(providers, { fields: [users.id], references: [providers.user_id] }),
  patientProfile: one(patient_profiles, { fields: [users.id], references: [patient_profiles.user_id] }),
  appointments: many(appointments),
  benefitVerificationAttempts: many(user_benefit_verification_attempts),
  sponsoringOrganization: one(organizations, { fields: [users.sponsoring_organization_id], references: [organizations.id] }),
  selectedPackage: one(packages, { fields: [users.selected_package_id], references: [packages.id] }),
  sentMessages: many(messages, { relationName: 'sentMessages' }),
  receivedMessages: many(messages, { relationName: 'receivedMessages' }),
}));

export const userBenefitVerificationAttemptsRelations = relations(user_benefit_verification_attempts, ({ one }) => ({
  user: one(users, {
    fields: [user_benefit_verification_attempts.user_id],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [user_benefit_verification_attempts.organization_id],
    references: [organizations.id],
  }),
}));

export const patientProfilesRelations = relations(patient_profiles, ({ one, many }) => ({
  user: one(users, {
    fields: [patient_profiles.user_id],
    references: [users.id],
  }),
}));

export const providersRelations = relations(providers, ({ one, many }) => ({
  user: one(users, {
    fields: [providers.user_id],
    references: [users.id],
  }),
  weeklySchedules: many(provider_weekly_schedules),
  timeBlocks: many(provider_time_blocks),
  appointments: many(appointments),
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
  patient: one(users, {
    fields: [appointments.patient_id],
    references: [users.id],
  }),
}));

export const organizationApprovedEmailsRelations = relations(organization_approved_emails, ({ one }) => ({
    organization: one(organizations, {
        fields: [organization_approved_emails.organization_id],
        references: [organizations.id],
    }),
}));

// Relations for Messaging
export const messagesRelations = relations(messages, ({ one, many }) => ({
  sender: one(users, {
    fields: [messages.sender_id],
    references: [users.id],
    relationName: 'sentMessages'
  }),
  receiver: one(users, {
    fields: [messages.receiver_id],
    references: [users.id],
    relationName: 'receivedMessages'
  }),
  attachments: many(message_attachments),
}));

export const messageAttachmentsRelations = relations(message_attachments, ({ one }) => ({
  message: one(messages, {
    fields: [message_attachments.message_id],
    references: [messages.id],
  }),
}));