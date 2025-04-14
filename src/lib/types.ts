// This file likely contained shared types used across the application,
// particularly those related to database enums or specific server-side logic.

// Recreating AppointmentStatus based on usage in schema and actions
export const AppointmentStatus = {
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  PENDING: 'pending',
  CONFIRMED: 'confirmed', // Value inferred from usage in getAvailableDatesForProvider
} as const;

// Type helper if needed elsewhere (can be derived from the const object)
// export type AppointmentStatusValue = typeof AppointmentStatus[keyof typeof AppointmentStatus]; 