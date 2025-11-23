export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_type: string
          client_id: string | null
          clinic_id: string
          created_at: string
          end_time: string
          id: string
          notes: string | null
          pet_id: string | null
          start_time: string
          status: string | null
          updated_at: string
          vet_id: string | null
        }
        Insert: {
          appointment_type: string
          client_id?: string | null
          clinic_id: string
          created_at?: string
          end_time: string
          id?: string
          notes?: string | null
          pet_id?: string | null
          start_time: string
          status?: string | null
          updated_at?: string
          vet_id?: string | null
        }
        Update: {
          appointment_type?: string
          client_id?: string | null
          clinic_id?: string
          created_at?: string
          end_time?: string
          id?: string
          notes?: string | null
          pet_id?: string | null
          start_time?: string
          status?: string | null
          updated_at?: string
          vet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_vet_id_fkey"
            columns: ["vet_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          clinic_id: string
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          notes: string | null
          phone_primary: string
          phone_secondary: string | null
          portal_enabled: boolean | null
          portal_login_method: string | null
          status: string | null
          updated_at: string
          whatsapp_opt_in: boolean | null
        }
        Insert: {
          address?: string | null
          clinic_id: string
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          phone_primary: string
          phone_secondary?: string | null
          portal_enabled?: boolean | null
          portal_login_method?: string | null
          status?: string | null
          updated_at?: string
          whatsapp_opt_in?: boolean | null
        }
        Update: {
          address?: string | null
          clinic_id?: string
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          phone_primary?: string
          phone_secondary?: string | null
          portal_enabled?: boolean | null
          portal_login_method?: string | null
          status?: string | null
          updated_at?: string
          whatsapp_opt_in?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          settings: Json | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          settings?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      pets: {
        Row: {
          alert_note: string | null
          birth_date: string | null
          blood_type: string | null
          breed: string | null
          client_id: string
          clinic_id: string
          color_markings: string | null
          created_at: string
          current_weight: number | null
          enclosure_number: string | null
          fee_exempt_reason: string | null
          food_type: string | null
          has_allergies: boolean | null
          id: string
          inactive_reason: string | null
          insurance_name: string | null
          is_alert: boolean | null
          is_insured: boolean | null
          last_file_sent_date: string | null
          license_number: string | null
          metrics_history: Json | null
          microchip_date: string | null
          microchip_number: string | null
          name: string
          neuter_date: string | null
          neuter_status: string | null
          notes: string | null
          previous_owner: string | null
          price_list: string | null
          sex: string | null
          species: string
          status: string | null
          updated_at: string
          weight_history: Json | null
        }
        Insert: {
          alert_note?: string | null
          birth_date?: string | null
          blood_type?: string | null
          breed?: string | null
          client_id: string
          clinic_id: string
          color_markings?: string | null
          created_at?: string
          current_weight?: number | null
          enclosure_number?: string | null
          fee_exempt_reason?: string | null
          food_type?: string | null
          has_allergies?: boolean | null
          id?: string
          inactive_reason?: string | null
          insurance_name?: string | null
          is_alert?: boolean | null
          is_insured?: boolean | null
          last_file_sent_date?: string | null
          license_number?: string | null
          metrics_history?: Json | null
          microchip_date?: string | null
          microchip_number?: string | null
          name: string
          neuter_date?: string | null
          neuter_status?: string | null
          notes?: string | null
          previous_owner?: string | null
          price_list?: string | null
          sex?: string | null
          species: string
          status?: string | null
          updated_at?: string
          weight_history?: Json | null
        }
        Update: {
          alert_note?: string | null
          birth_date?: string | null
          blood_type?: string | null
          breed?: string | null
          client_id?: string
          clinic_id?: string
          color_markings?: string | null
          created_at?: string
          current_weight?: number | null
          enclosure_number?: string | null
          fee_exempt_reason?: string | null
          food_type?: string | null
          has_allergies?: boolean | null
          id?: string
          inactive_reason?: string | null
          insurance_name?: string | null
          is_alert?: boolean | null
          is_insured?: boolean | null
          last_file_sent_date?: string | null
          license_number?: string | null
          metrics_history?: Json | null
          microchip_date?: string | null
          microchip_number?: string | null
          name?: string
          neuter_date?: string | null
          neuter_status?: string | null
          notes?: string | null
          previous_owner?: string | null
          price_list?: string | null
          sex?: string | null
          species?: string
          status?: string | null
          updated_at?: string
          weight_history?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "pets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pets_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      price_items: {
        Row: {
          category: string
          clinic_id: string
          code: string | null
          created_at: string
          id: string
          is_discountable: boolean | null
          name: string
          price_with_vat: number
          price_without_vat: number
          updated_at: string
        }
        Insert: {
          category: string
          clinic_id: string
          code?: string | null
          created_at?: string
          id?: string
          is_discountable?: boolean | null
          name: string
          price_with_vat: number
          price_without_vat: number
          updated_at?: string
        }
        Update: {
          category?: string
          clinic_id?: string
          code?: string | null
          created_at?: string
          id?: string
          is_discountable?: boolean | null
          name?: string
          price_with_vat?: number
          price_without_vat?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_items_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          clinic_id: string | null
          created_at: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          first_name: string
          id: string
          last_name: string
          phone?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          client_id: string
          clinic_id: string
          created_at: string
          due_date: string
          id: string
          last_channel: string | null
          notes: string | null
          pet_id: string
          reminder_type: string
          status: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          clinic_id: string
          created_at?: string
          due_date: string
          id?: string
          last_channel?: string | null
          notes?: string | null
          pet_id: string
          reminder_type: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          clinic_id?: string
          created_at?: string
          due_date?: string
          id?: string
          last_channel?: string | null
          notes?: string | null
          pet_id?: string
          reminder_type?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visit_price_items: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          price_at_time: number
          price_item_id: string
          quantity: number
          visit_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          price_at_time: number
          price_item_id: string
          quantity?: number
          visit_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          price_at_time?: number
          price_item_id?: string
          quantity?: number
          visit_id?: string
        }
        Relationships: []
      }
      visits: {
        Row: {
          chief_complaint: string | null
          client_id: string
          client_summary: string | null
          clinic_id: string
          created_at: string
          diagnoses: Json | null
          history: string | null
          id: string
          is_visible_to_client: boolean | null
          medications: Json | null
          pet_id: string
          physical_exam: string | null
          recommendations: string | null
          status: string | null
          treatments: Json | null
          updated_at: string
          vet_id: string | null
          visit_date: string
          visit_type: string
        }
        Insert: {
          chief_complaint?: string | null
          client_id: string
          client_summary?: string | null
          clinic_id: string
          created_at?: string
          diagnoses?: Json | null
          history?: string | null
          id?: string
          is_visible_to_client?: boolean | null
          medications?: Json | null
          pet_id: string
          physical_exam?: string | null
          recommendations?: string | null
          status?: string | null
          treatments?: Json | null
          updated_at?: string
          vet_id?: string | null
          visit_date?: string
          visit_type: string
        }
        Update: {
          chief_complaint?: string | null
          client_id?: string
          client_summary?: string | null
          clinic_id?: string
          created_at?: string
          diagnoses?: Json | null
          history?: string | null
          id?: string
          is_visible_to_client?: boolean | null
          medications?: Json | null
          pet_id?: string
          physical_exam?: string | null
          recommendations?: string | null
          status?: string | null
          treatments?: Json | null
          updated_at?: string
          vet_id?: string | null
          visit_date?: string
          visit_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "visits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_vet_id_fkey"
            columns: ["vet_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          appointment_id: string | null
          client_id: string | null
          clinic_id: string
          content: string
          created_at: string
          direction: string
          id: string
          provider_message_id: string | null
          reminder_id: string | null
          sent_at: string
        }
        Insert: {
          appointment_id?: string | null
          client_id?: string | null
          clinic_id: string
          content: string
          created_at?: string
          direction: string
          id?: string
          provider_message_id?: string | null
          reminder_id?: string | null
          sent_at?: string
        }
        Update: {
          appointment_id?: string | null
          client_id?: string | null
          clinic_id?: string
          content?: string
          created_at?: string
          direction?: string
          id?: string
          provider_message_id?: string | null
          reminder_id?: string | null
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "reminders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_clinic_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "vet" | "reception"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "vet", "reception"],
    },
  },
} as const
