import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
} from 'drizzle-orm/pg-core';
import { users } from '../schema'; // Assuming users table is in the main schema.ts

export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
  user_id: uuid('user_id').references(() => users.id, { onDelete: 'set null' }), // Link to users table, set null on user delete
  user_email: text('user_email'), // For easier display, denormalized
  action_type: text('action_type').notNull(), // E.g., 'USER_LOGIN', 'SETTINGS_UPDATE'
  target_entity_type: text('target_entity_type'), // E.g., 'USER', 'PACKAGE'
  target_entity_id: text('target_entity_id'), // ID of the entity acted upon
  details: jsonb('details'), // For additional context, e.g., old/new values
  status: text('status'), // E.g., 'SUCCESS', 'FAILURE', 'ATTEMPT'
  ip_address: text('ip_address'), // Optional: consider privacy
  description: text('description'), // Human-readable summary
});

// Optional: Define relations if needed for querying with Drizzle ORM
// import { relations } from 'drizzle-orm';
// export const activityLogRelations = relations(activityLogs, ({ one }) => ({
//   user: one(users, {
//     fields: [activityLogs.user_id],
//     references: [users.id],
//   }),
// })); 