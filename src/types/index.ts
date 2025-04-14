export type UserRole = 'admin' | 'staff' | 'patient' | 'provider';

export type PackageTier = 'basic' | 'premium' | 'custom';

export type PurchaseType = 'subscription' | 'one-time';

export type PackageStatus = 'purchased' | 'active' | 'expired' | 'completed';

export type TreatmentMilestone = {
  id: string;
  treatment_plan_id: string;
  appointment_id: string | null;
  title: string;
  description: string | null;
  status: 'pending' | 'completed' | 'cancelled';
  due_date: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  treatment_plan?: {
    title: string;
  };
  dependencies?: TreatmentMilestone[];
  depends_on?: string[];
};

export type TreatmentStatus = 'pending' | 'in_progress' | 'completed';

export type NotificationType = 
  | 'appointment_scheduled' 
  | 'appointment_reminder' 
  | 'appointment_cancelled' 
  | 'appointment_completed'
  | 'milestone_completed';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface UserActivity {
  id: string;
  user_id: string;
  action: string;
  created_at: string;
}

export interface Package {
  id: string;
  name: string;
  description: string;
  price: number;
  tier: PackageTier;
  validity_period?: number; // in days
  purchase_type: PurchaseType;
  features?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface PatientPackage {
  id: string;
  patient_id: string;
  package_id: string;
  status: PackageStatus;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

export interface Treatment {
  id: string;
  patient_id: string;
  provider_id: string;
  type: string;
  description: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  appointment_date: string;
  notes?: string;
  created_at: string;
  provider?: Provider;
  patient?: Patient;
}

export interface DashboardStats {
  totalUsers: number;
  totalPackages: number;
  activeTreatments: number;
  totalRevenue: number;
}

export interface Provider {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  specialization?: string | null;
  bio?: string | null;
  experience_years?: number | null;
  education?: string[] | null;
  certifications?: string[] | null;
  availability?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface ProviderAvailability {
  id: string;
  provider_id: string;
  day_of_week: number; // 0-6 for Sunday-Saturday
  start_time: string; // HH:mm format
  end_time: string; // HH:mm format
  created_at: string;
  updated_at: string;
}

export type Appointment = {
  id: string;
  patient_id: string;
  provider_id: string;
  appointment_date: string;
  duration?: number;
  type?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'pending';
  notes?: string | null;
  created_at: string;
  updated_at: string;
  provider?: {
    id: string;
    user_id: string;
    first_name: string | null;
    last_name: string | null;
    specialization: string | null;
  };
  patient?: {
    id: string;
    user_id: string;
    first_name: string | null;
    last_name: string | null;
    phone?: string | null;
  };
};

export interface AppointmentSlot {
  id: string;
  provider_id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  date_of_birth?: string;
  phone?: string;
  address?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  attachments?: (string | MessageAttachment)[];
  created_at: string;
  sender?: {
    first_name: string;
    last_name: string;
    role: string;
  };
  receiver?: {
    first_name: string;
    last_name: string;
    role: string;
  };
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  appointment_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface TreatmentPlan {
  id: string;
  patient_id: string;
  provider_id: string;
  type: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'discontinued';
  start_date: string;
  end_date?: string;
  created_at: string;
  provider?: Provider;
  patient?: Patient;
  milestones?: TreatmentMilestone[];
}

export interface TreatmentNote {
  id: string;
  treatment_plan_id: string;
  milestone_id: string;
  appointment_id: string;
  provider_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  provider?: {
    first_name: string;
    last_name: string;
  };
  milestone?: TreatmentMilestone;
  appointment?: Appointment;
}

export interface MilestoneDependency {
  id: string;
  milestone_id: string;
  depends_on_milestone_id: string;
  created_at: string;
  updated_at: string;
}

export interface PatientProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  insurance_provider: string | null;
  insurance_id: string | null;
  blood_type: string | null;
  allergies: string | null;
  medications: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmergencyContact {
  id: string;
  patient_id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface MedicalHistory {
  id: string;
  patient_id: string;
  condition: string;
  diagnosis_date: string;
  treatment: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProviderTimeBlock {
  id: string;
  provider_id: string;
  start_datetime: string; // ISO string format
  end_datetime: string; // ISO string format
  reason?: string | null;
  is_unavailable: boolean;
  created_at: string;
}

export interface Document {
  id: string;
  patient_id: string;
  category_id?: string | null;
  title: string;
  description?: string | null;
  file_path: string;
  file_type: string;
  file_size: number;
  is_private?: boolean | null;
  metadata?: Record<string, any> | null;
  created_at?: string | null;
  updated_at?: string | null;
  uploaded_by?: string | null;
  category?: {
    id: string;
    name: string;
    description?: string | null;
  } | null;
} 