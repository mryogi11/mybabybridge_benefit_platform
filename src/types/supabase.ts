export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_date: string
          created_at: string
          duration: number | null
          id: string
          notes: string | null
          patient_id: string
          provider_id: string
          status: Database["public"]["Enums"]["appointment_status"]
          type: string | null
          updated_at: string
        }
        Insert: {
          appointment_date: string
          created_at?: string
          duration?: number | null
          id?: string
          notes?: string | null
          patient_id: string
          provider_id: string
          status: Database["public"]["Enums"]["appointment_status"]
          type?: string | null
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          created_at?: string
          duration?: number | null
          id?: string
          notes?: string | null
          patient_id?: string
          provider_id?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_users_id_fk"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_provider_id_providers_id_fk"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          created_at: string
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          message_id: string
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          message_id: string
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_messages_id_fk"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          created_at: string
          id: string
          is_read: boolean
          receiver_id: string | null
          sender_id: string | null
          thread_id: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id?: string | null
          sender_id?: string | null
          thread_id: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id?: string | null
          sender_id?: string | null
          thread_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_users_id_fk"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_users_id_fk"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_approved_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          organization_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_approved_emails_organization_id_organizations_id_f"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_packages: {
        Row: {
          created_at: string
          organization_id: string
          package_id: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          package_id: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          package_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_packages_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_packages_package_id_packages_id_fk"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          domain: string | null
          hr_contact_info: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          domain?: string | null
          hr_contact_info?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          domain?: string | null
          hr_contact_info?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      packages: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_base_employer_package: boolean
          key_benefits: string[] | null
          monthly_cost: number
          name: string
          tier: Database["public"]["Enums"]["package_tier"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_base_employer_package?: boolean
          key_benefits?: string[] | null
          monthly_cost?: number
          name: string
          tier: Database["public"]["Enums"]["package_tier"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_base_employer_package?: boolean
          key_benefits?: string[] | null
          monthly_cost?: number
          name?: string
          tier?: Database["public"]["Enums"]["package_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      patient_profiles: {
        Row: {
          address: string | null
          allergies: string | null
          blood_type: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          first_name: string | null
          id: string
          insurance_id: string | null
          insurance_provider: string | null
          last_name: string | null
          medications: string | null
          phone: string | null
          state: string | null
          updated_at: string
          user_id: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          allergies?: string | null
          blood_type?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          insurance_id?: string | null
          insurance_provider?: string | null
          last_name?: string | null
          medications?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          allergies?: string | null
          blood_type?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          insurance_id?: string | null
          insurance_provider?: string | null
          last_name?: string | null
          medications?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_profiles_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_time_blocks: {
        Row: {
          created_at: string
          end_datetime: string
          id: string
          is_unavailable: boolean
          provider_id: string
          reason: string | null
          start_datetime: string
        }
        Insert: {
          created_at?: string
          end_datetime: string
          id?: string
          is_unavailable?: boolean
          provider_id: string
          reason?: string | null
          start_datetime: string
        }
        Update: {
          created_at?: string
          end_datetime?: string
          id?: string
          is_unavailable?: boolean
          provider_id?: string
          reason?: string | null
          start_datetime?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_time_blocks_provider_id_providers_id_fk"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_weekly_schedules: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          provider_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          provider_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          provider_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_weekly_schedules_provider_id_providers_id_fk"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          bio: string | null
          certifications: string[] | null
          created_at: string
          education: string[] | null
          experience_years: number | null
          first_name: string
          id: string
          last_name: string
          specialization: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          certifications?: string[] | null
          created_at?: string
          education?: string[] | null
          experience_years?: number | null
          first_name: string
          id?: string
          last_name: string
          specialization?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          certifications?: string[] | null
          created_at?: string
          education?: string[] | null
          experience_years?: number | null
          first_name?: string
          id?: string
          last_name?: string
          specialization?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "providers_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_benefit_verification_attempts: {
        Row: {
          created_at: string
          failure_reason: string | null
          id: string
          organization_id: string | null
          status: Database["public"]["Enums"]["verification_status"]
          submitted_dob: string | null
          submitted_first_name: string | null
          submitted_last_name: string | null
          submitted_phone: string | null
          submitted_work_email: string | null
          user_id: string
          verification_attempt_timestamp: string
        }
        Insert: {
          created_at?: string
          failure_reason?: string | null
          id?: string
          organization_id?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          submitted_dob?: string | null
          submitted_first_name?: string | null
          submitted_last_name?: string | null
          submitted_phone?: string | null
          submitted_work_email?: string | null
          user_id: string
          verification_attempt_timestamp?: string
        }
        Update: {
          created_at?: string
          failure_reason?: string | null
          id?: string
          organization_id?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          submitted_dob?: string | null
          submitted_first_name?: string | null
          submitted_last_name?: string | null
          submitted_phone?: string | null
          submitted_work_email?: string | null
          user_id?: string
          verification_attempt_timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_benefit_verification_attempts_organization_id_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_benefit_verification_attempts_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          address_city: string | null
          address_country: string | null
          address_line1: string | null
          address_line2: string | null
          address_postal_code: string | null
          address_state: string | null
          benefit_source: Database["public"]["Enums"]["benefit_source"] | null
          benefit_status: Database["public"]["Enums"]["benefit_status"] | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          role: Database["public"]["Enums"]["user_role"]
          sponsoring_organization_id: string | null
          stripe_customer_id: string | null
          theme_preference: Database["public"]["Enums"]["theme_mode"] | null
          updated_at: string
        }
        Insert: {
          address_city?: string | null
          address_country?: string | null
          address_line1?: string | null
          address_line2?: string | null
          address_postal_code?: string | null
          address_state?: string | null
          benefit_source?: Database["public"]["Enums"]["benefit_source"] | null
          benefit_status?: Database["public"]["Enums"]["benefit_status"] | null
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          sponsoring_organization_id?: string | null
          stripe_customer_id?: string | null
          theme_preference?: Database["public"]["Enums"]["theme_mode"] | null
          updated_at?: string
        }
        Update: {
          address_city?: string | null
          address_country?: string | null
          address_line1?: string | null
          address_line2?: string | null
          address_postal_code?: string | null
          address_state?: string | null
          benefit_source?: Database["public"]["Enums"]["benefit_source"] | null
          benefit_status?: Database["public"]["Enums"]["benefit_status"] | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          sponsoring_organization_id?: string | null
          stripe_customer_id?: string | null
          theme_preference?: Database["public"]["Enums"]["theme_mode"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_sponsoring_organization_id_organizations_id_fk"
            columns: ["sponsoring_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_appointment_metrics: {
        Args: {
          p_patient_profile_id: string
          p_start_date: string
          p_end_date: string
        }
        Returns: Json
      }
      calculate_patient_engagement_metrics: {
        Args: { p_patient_id: string; p_start_date: string; p_end_date: string }
        Returns: Json
      }
      calculate_treatment_success_metrics: {
        Args: { p_patient_id: string; p_start_date: string; p_end_date: string }
        Returns: Json
      }
      get_appointment_stats: {
        Args: { provider_id: string; start_date: string; end_date: string }
        Returns: {
          status: string
          count: number
        }[]
      }
      get_patient_progress: {
        Args: { provider_id: string; start_date: string; end_date: string }
        Returns: {
          month: string
          completed: number
          in_progress: number
          pending: number
        }[]
      }
      get_provider_revenue: {
        Args: { provider_id: string; start_date: string; end_date: string }
        Returns: {
          date: string
          amount: number
        }[]
      }
      get_treatment_success_rates: {
        Args: { provider_id: string; start_date: string; end_date: string }
        Returns: {
          status: string
          count: number
        }[]
      }
      is_admin: {
        Args: Record<PropertyKey, never> | { user_id: string }
        Returns: boolean
      }
      is_users_patient_profile: {
        Args: { profile_id: string }
        Returns: boolean
      }
      is_users_provider_profile: {
        Args: { profile_id: string }
        Returns: boolean
      }
      send_appointment_notification: {
        Args: {
          p_appointment_id: string
          p_type: string
          p_title: string
          p_message: string
        }
        Returns: undefined
      }
      send_appointment_reminders: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_appointment_status: {
        Args: { p_appointment_id: string; p_status: string }
        Returns: undefined
      }
    }
    Enums: {
      appointment_status:
        | "scheduled"
        | "completed"
        | "cancelled"
        | "pending"
        | "confirmed"
      benefit_source: "employer_or_plan" | "partner_or_parent" | "none"
      benefit_status:
        | "not_started"
        | "pending_verification"
        | "verified"
        | "declined"
        | "no_benefit"
      package_tier: "basic" | "silver" | "gold" | "platinum"
      theme_mode: "light" | "dark" | "system"
      user_role: "admin" | "staff" | "provider" | "patient"
      verification_status: "pending" | "success" | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      appointment_status: [
        "scheduled",
        "completed",
        "cancelled",
        "pending",
        "confirmed",
      ],
      benefit_source: ["employer_or_plan", "partner_or_parent", "none"],
      benefit_status: [
        "not_started",
        "pending_verification",
        "verified",
        "declined",
        "no_benefit",
      ],
      package_tier: ["basic", "silver", "gold", "platinum"],
      theme_mode: ["light", "dark", "system"],
      user_role: ["admin", "staff", "provider", "patient"],
      verification_status: ["pending", "success", "failed"],
    },
  },
} as const
