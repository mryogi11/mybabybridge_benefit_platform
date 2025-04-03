// Define the possible roles a user can have
export type UserRole = 'admin' | 'staff' | 'provider' | 'patient';

// Define the structure for user profile data (matching public.users table)
export interface User {
  id: string; // Matches Supabase Auth user ID (UUID)
  role: UserRole;
  email?: string;
  first_name?: string;
  last_name?: string;
  // Add any other fields that are present in your public.users table
} 