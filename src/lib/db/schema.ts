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
  pgEnum
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { AppointmentStatus } from '@/lib/types';

// --- Users Table (Mirroring Supabase migration - linked to auth.users) ---
// Note: Drizzle cannot directly reference auth.users. We assume this table
// mirrors essential user data and links via the UUID.
// You might need custom SQL or triggers in migrations if syncing is needed.
export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // References auth.users(id)
  email: text('email').notNull().unique(),
  // Add other columns if they exist in your public.users table from migrations
  // Assuming first_name/last_name are primarily on profile tables
  role: pgEnum('user_role', ['admin', 'staff', 'provider', 'patient'])('role').notNull().default('patient'), // Enum defined in migrations
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Patient Profiles Table (Mirroring Supabase migration) ---
export const patient_profiles = pgTable('patient_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }), // Assuming FK to public.users id
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
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
    .references(() => patient_profiles.id, { onDelete: 'cascade' })
    .notNull(),
  provider_id: uuid('provider_id')
    .references(() => providers.id, { onDelete: 'cascade' })
    .notNull(),
  appointment_date: timestamp('appointment_date', { withTimezone: true }).notNull(), // Renamed from startTime, matches migration
  status: text('status', { // Use text directly if enum type isn't managed by Drizzle
    enum: ['scheduled', 'completed', 'cancelled', 'pending', 'confirmed'], // Keep enum values for type safety
  })
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
export const usersRelations = relations(users, ({ one, many }) => ({
  providerProfile: one(providers, { // Relation from user to provider profile
    fields: [users.id],
    references: [providers.user_id],
  }),
  patientProfile: one(patient_profiles, { // Relation from user to patient profile
    fields: [users.id],
    references: [patient_profiles.user_id],
  }),
}));

export const patientProfilesRelations = relations(patient_profiles, ({ one, many }) => ({
  user: one(users, {
    fields: [patient_profiles.user_id],
    references: [users.id],
  }),
  appointments: many(appointments), // Patient can have many appointments
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
  patient: one(patient_profiles, { // Corrected relation name
    fields: [appointments.patient_id],
    references: [patient_profiles.id],
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