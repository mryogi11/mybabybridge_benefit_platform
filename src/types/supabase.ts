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
      analytics_events: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          patient_id: string | null
          provider_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          patient_id?: string | null
          provider_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          patient_id?: string | null
          provider_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_metrics: {
        Row: {
          created_at: string | null
          id: string
          metric_type: string
          metric_value: Json | null
          patient_id: string | null
          period_end: string
          period_start: string
          provider_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metric_type: string
          metric_value?: Json | null
          patient_id?: string | null
          period_end: string
          period_start: string
          provider_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metric_type?: string
          metric_value?: Json | null
          patient_id?: string | null
          period_end?: string
          period_start?: string
          provider_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_metrics_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_metrics_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_reports: {
        Row: {
          created_at: string | null
          id: string
          patient_id: string | null
          period_end: string
          period_start: string
          provider_id: string | null
          report_data: Json | null
          report_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          patient_id?: string | null
          period_end: string
          period_start: string
          provider_id?: string | null
          report_data?: Json | null
          report_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          patient_id?: string | null
          period_end?: string
          period_start?: string
          provider_id?: string | null
          report_data?: Json | null
          report_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_reports_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_reports_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
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
            foreignKeyName: "appointments_patient_profile_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
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
      document_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      document_shares: {
        Row: {
          created_at: string | null
          document_id: string | null
          expires_at: string | null
          id: string
          permission: string
          shared_with: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          document_id?: string | null
          expires_at?: string | null
          id?: string
          permission: string
          shared_with?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          document_id?: string | null
          expires_at?: string | null
          id?: string
          permission?: string
          shared_with?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_shares_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category_id: string | null
          created_at: string | null
          description: string | null
          file_path: string
          file_size: number
          file_type: string
          id: string
          is_private: boolean | null
          metadata: Json | null
          patient_id: string | null
          provider_id: string | null
          title: string
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          file_path: string
          file_size: number
          file_type: string
          id?: string
          is_private?: boolean | null
          metadata?: Json | null
          patient_id?: string | null
          provider_id?: string | null
          title: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          is_private?: boolean | null
          metadata?: Json | null
          patient_id?: string | null
          provider_id?: string | null
          title?: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "document_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      education_categories: {
        Row: {
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      education_resources: {
        Row: {
          category_id: string | null
          content: string
          created_at: string
          description: string | null
          difficulty_level: string | null
          id: string
          media_type: string | null
          media_url: string | null
          reading_time: number | null
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          content: string
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          reading_time?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          content?: string
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          reading_time?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "education_resources_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "education_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          patient_id: string | null
          phone: string
          relationship: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          patient_id?: string | null
          phone: string
          relationship: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          patient_id?: string | null
          phone?: string
          relationship?: string
          updated_at?: string
        }
        Relationships: []
      }
      feedback_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      feedback_responses: {
        Row: {
          created_at: string | null
          feedback_id: string
          feedback_type: string
          id: string
          responder_id: string | null
          response_text: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          feedback_id: string
          feedback_type: string
          id?: string
          responder_id?: string | null
          response_text: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          feedback_id?: string
          feedback_type?: string
          id?: string
          responder_id?: string | null
          response_text?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      medical_history: {
        Row: {
          condition: string
          created_at: string
          diagnosis_date: string
          id: string
          notes: string | null
          patient_id: string | null
          treatment: string | null
          updated_at: string
        }
        Insert: {
          condition: string
          created_at?: string
          diagnosis_date: string
          id?: string
          notes?: string | null
          patient_id?: string | null
          treatment?: string | null
          updated_at?: string
        }
        Update: {
          condition?: string
          created_at?: string
          diagnosis_date?: string
          id?: string
          notes?: string | null
          patient_id?: string | null
          treatment?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      message_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          message_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          message_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_url: string | null
          content: string
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          attachment_url?: string | null
          content: string
          created_at?: string
          id?: string
          receiver_id: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          attachment_url?: string | null
          content?: string
          created_at?: string
          id?: string
          receiver_id?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      milestone_dependencies: {
        Row: {
          created_at: string
          depends_on_milestone_id: string | null
          id: string
          milestone_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          depends_on_milestone_id?: string | null
          id?: string
          milestone_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          depends_on_milestone_id?: string | null
          id?: string
          milestone_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestone_dependencies_depends_on_milestone_id_fkey"
            columns: ["depends_on_milestone_id"]
            isOneToOne: false
            referencedRelation: "treatment_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestone_dependencies_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "treatment_milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          appointment_id: string | null
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
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
            foreignKeyName: "organization_approved_emails_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          default_benefit_package_id: string | null
          domain: string | null
          hr_contact_info: string | null
          id: string
          name: string
          updated_at: string
          verification_domains: string[] | null
        }
        Insert: {
          created_at?: string
          default_benefit_package_id?: string | null
          domain?: string | null
          hr_contact_info?: string | null
          id?: string
          name: string
          updated_at?: string
          verification_domains?: string[] | null
        }
        Update: {
          created_at?: string
          default_benefit_package_id?: string | null
          domain?: string | null
          hr_contact_info?: string | null
          id?: string
          name?: string
          updated_at?: string
          verification_domains?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_default_benefit_package_id_packages_id_fk"
            columns: ["default_benefit_package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          created_at: string
          description: string | null
          features: string[] | null
          id: string
          is_upgrade_option: boolean
          monthly_cost: number
          name: string
          tier_level: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: string[] | null
          id?: string
          is_upgrade_option?: boolean
          monthly_cost?: number
          name: string
          tier_level: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: string[] | null
          id?: string
          is_upgrade_option?: boolean
          monthly_cost?: number
          name?: string
          tier_level?: number
          updated_at?: string
        }
        Relationships: []
      }
      patient_education_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          last_accessed_at: string | null
          patient_id: string | null
          progress_percentage: number | null
          resource_id: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          last_accessed_at?: string | null
          patient_id?: string | null
          progress_percentage?: number | null
          resource_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          last_accessed_at?: string | null
          patient_id?: string | null
          progress_percentage?: number | null
          resource_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_education_progress_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_education_progress_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "education_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_packages: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          package_id: string
          patient_id: string
          start_date: string
          status: Database["public"]["Enums"]["package_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          package_id: string
          patient_id: string
          start_date: string
          status?: Database["public"]["Enums"]["package_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          package_id?: string
          patient_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["package_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_packages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_profiles: {
        Row: {
          address: string | null
          allergies: string | null
          benefit_status: Database["public"]["Enums"]["benefit_status"]
          benefit_verified_at: string | null
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
          organization_id: string | null
          phone: string | null
          selected_package_id: string | null
          state: string | null
          updated_at: string
          user_id: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          allergies?: string | null
          benefit_status?: Database["public"]["Enums"]["benefit_status"]
          benefit_verified_at?: string | null
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
          organization_id?: string | null
          phone?: string | null
          selected_package_id?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          allergies?: string | null
          benefit_status?: Database["public"]["Enums"]["benefit_status"]
          benefit_verified_at?: string | null
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
          organization_id?: string | null
          phone?: string | null
          selected_package_id?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_profiles_organization_id_organizations_id_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_profiles_selected_package_id_packages_id_fk"
            columns: ["selected_package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_profiles_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_reviews: {
        Row: {
          category_id: string | null
          created_at: string | null
          id: string
          is_anonymous: boolean | null
          patient_id: string | null
          provider_id: string | null
          rating: number
          review_text: string | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          patient_id?: string | null
          provider_id?: string | null
          rating: number
          review_text?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          patient_id?: string | null
          provider_id?: string | null
          rating?: number
          review_text?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_reviews_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "feedback_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_reviews_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
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
            foreignKeyName: "provider_time_blocks_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "provider_weekly_schedules_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
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
        Relationships: []
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
          benefit_source: Database["public"]["Enums"]["benefit_source"] | null
          benefit_status: Database["public"]["Enums"]["benefit_status"] | null
          created_at: string
          email: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          selected_package_id: string | null
          sponsoring_organization_id: string | null
          updated_at: string
        }
        Insert: {
          benefit_source?: Database["public"]["Enums"]["benefit_source"] | null
          benefit_status?: Database["public"]["Enums"]["benefit_status"] | null
          created_at?: string
          email: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          selected_package_id?: string | null
          sponsoring_organization_id?: string | null
          updated_at?: string
        }
        Update: {
          benefit_source?: Database["public"]["Enums"]["benefit_source"] | null
          benefit_status?: Database["public"]["Enums"]["benefit_status"] | null
          created_at?: string
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          selected_package_id?: string | null
          sponsoring_organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_selected_package_id_packages_id_fk"
            columns: ["selected_package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
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
        Args: { user_id: string } | Record<PropertyKey, never>
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
        | "pending_verification"
        | "verified"
        | "declined"
        | "not_applicable"
        | "not_started"
      package_status: "purchased" | "active" | "expired" | "completed"
      package_tier: "basic" | "premium" | "custom"
      purchase_type: "subscription" | "one-time"
      treatment_milestone:
        | "patient_details"
        | "initial_consultation"
        | "treatment_phase"
        | "prenatal_care"
      treatment_status: "pending" | "in_progress" | "completed"
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
        "pending_verification",
        "verified",
        "declined",
        "not_applicable",
        "not_started",
      ],
      package_status: ["purchased", "active", "expired", "completed"],
      package_tier: ["basic", "premium", "custom"],
      purchase_type: ["subscription", "one-time"],
      treatment_milestone: [
        "patient_details",
        "initial_consultation",
        "treatment_phase",
        "prenatal_care",
      ],
      treatment_status: ["pending", "in_progress", "completed"],
      user_role: ["admin", "staff", "provider", "patient"],
      verification_status: ["pending", "success", "failed"],
    },
  },
} as const
