// src/types/index.ts

// --- User Type ---
// Matches the fields selected in messageActions.ts, assumes dates are strings
export interface User {
  id: string;
  email: string; // non-null in schema
  first_name?: string; // Use optional string (maps null to undefined)
  last_name?: string; // Use optional string (maps null to undefined)
  role: 'admin' | 'staff' | 'provider' | 'patient'; // userRoleEnum values
  created_at: string; // Comes as Date, converted to string
  updated_at: string; // Comes as Date, converted to string
  avatar_url?: string | null; // Keep optional as it's not in DB
}

// --- MessageAttachment Type ---
// Matches the Drizzle schema for message_attachments table
export interface MessageAttachment {
  id: string;
  message_id: string;
  file_url: string;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  created_at: string; // Comes as Date, converted to string
}

// --- Message Type ---
// Includes all fields selected/returned by messageActions.ts
// Assumes dates are strings and handles nullability
export interface Message {
  id: string;
  sender_id: string | null; // Can be null in DB
  receiver_id: string | null; // Can be null in DB
  content: string; // Mapped null to '' in actions
  thread_id: string; // Included field
  is_read: boolean; // Included field
  created_at: string; // Comes as Date, converted to string
  updated_at: string; // Included field, comes as Date, converted to string
  sender?: User | null; // Optional sender object (User type defined above)
  attachments: MessageAttachment[]; // Mapped null to [] in actions
}

// --- Provider Type ---
// Matches the Drizzle schema for providers table
export interface Provider {
  id: string;
  user_id: string;
  first_name: string; // Not null in schema
  last_name: string; // Not null in schema
  specialization: string | null;
  bio: string | null;
  experience_years: number | null;
  education: string[] | null;
  certifications: string[] | null;
  created_at: string; // Assuming conversion to string if used directly
  updated_at: string; // Assuming conversion to string if used directly
  // Include User details if needed/joined elsewhere:
  // user?: User;
}

// --- Appointment Type (Example - ensure this matches your schema/usage) ---
export interface Appointment {
  id: string;
  patient_id: string;
  provider_id: string;
  appointment_date: string; // Assuming string conversion
  status: 'scheduled' | 'completed' | 'cancelled' | 'pending' | 'confirmed';
  notes: string | null;
  duration: number | null;
  type: string | null;
  created_at: string;
  updated_at: string;
  // Include patient/provider details if joined:
  // patient?: User | null;
  provider?: Provider | null; // Uncommented provider details
}

// --- Package Related Enums/Types ---
export type PackageTier = 'basic' | 'silver' | 'gold' | 'platinum';
export type PurchaseType = 'one-time' | 'subscription'; // Add other types if needed

// --- Package Type ---
export interface Package {
  id: string;
  name: string;
  tier: PackageTier; // Use the exported type
  monthly_cost: number; 
  description: string | null;
  key_benefits: string[] | null;
  is_base_employer_package: boolean;
  created_at: string;
  updated_at: string;
  // Fields that were causing errors, decide if they should be optional or removed
  // price?: number; // If monthly_cost is the primary, this might be redundant or for display variations
  // validity_period?: number;
  // purchase_type?: PurchaseType; // if package itself dictates this, otherwise managed by purchase flow
  // features?: string[]; // if key_benefits is the standard
}

// --- Add other necessary type definitions below ---

// export interface PatientProfile { ... }
// export interface Organization { ... }
// etc.
