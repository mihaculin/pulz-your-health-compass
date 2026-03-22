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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      baseline_profiles: {
        Row: {
          daypart: string | null
          hr_mean: number | null
          hr_std: number | null
          hrv_mean: number | null
          hrv_std: number | null
          id: string
          last_calculated: string | null
          rhr_mean: number | null
          rhr_std: number | null
          stress_mean: number | null
          stress_std: number | null
          user_id: string
          window_days: number | null
        }
        Insert: {
          daypart?: string | null
          hr_mean?: number | null
          hr_std?: number | null
          hrv_mean?: number | null
          hrv_std?: number | null
          id?: string
          last_calculated?: string | null
          rhr_mean?: number | null
          rhr_std?: number | null
          stress_mean?: number | null
          stress_std?: number | null
          user_id: string
          window_days?: number | null
        }
        Update: {
          daypart?: string | null
          hr_mean?: number | null
          hr_std?: number | null
          hrv_mean?: number | null
          hrv_std?: number | null
          id?: string
          last_calculated?: string | null
          rhr_mean?: number | null
          rhr_std?: number | null
          stress_mean?: number | null
          stress_std?: number | null
          user_id?: string
          window_days?: number | null
        }
        Relationships: []
      }
      client_profiles: {
        Row: {
          assigned_specialist_id: string | null
          co_occurring_conditions: string[] | null
          created_at: string
          date_of_birth: string | null
          eating_disorder_history_years: number | null
          gender: string | null
          height_cm: number | null
          id: string
          intake_survey_completed: boolean | null
          intake_survey_responses: Json | null
          medications: string | null
          menstrual_cycle_tracking: boolean | null
          onboarding_completed: boolean | null
          primary_concerns: string[] | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          assigned_specialist_id?: string | null
          co_occurring_conditions?: string[] | null
          created_at?: string
          date_of_birth?: string | null
          eating_disorder_history_years?: number | null
          gender?: string | null
          height_cm?: number | null
          id: string
          intake_survey_completed?: boolean | null
          intake_survey_responses?: Json | null
          medications?: string | null
          menstrual_cycle_tracking?: boolean | null
          onboarding_completed?: boolean | null
          primary_concerns?: string[] | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          assigned_specialist_id?: string | null
          co_occurring_conditions?: string[] | null
          created_at?: string
          date_of_birth?: string | null
          eating_disorder_history_years?: number | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          intake_survey_completed?: boolean | null
          intake_survey_responses?: Json | null
          medications?: string | null
          menstrual_cycle_tracking?: boolean | null
          onboarding_completed?: boolean | null
          primary_concerns?: string[] | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      consent_records: {
        Row: {
          consent_text_version: string | null
          consent_type: string | null
          given_at: string | null
          id: string
          ip_address: string | null
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          consent_text_version?: string | null
          consent_type?: string | null
          given_at?: string | null
          id?: string
          ip_address?: string | null
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          consent_text_version?: string | null
          consent_type?: string | null
          given_at?: string | null
          id?: string
          ip_address?: string | null
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      device_connections: {
        Row: {
          access_token_encrypted: string | null
          created_at: string
          device_type: string
          id: string
          is_active: boolean | null
          last_sync: string | null
          refresh_token_encrypted: string | null
          scopes_granted: string[] | null
          source_platform: string | null
          token_expiry: string | null
          user_id: string
        }
        Insert: {
          access_token_encrypted?: string | null
          created_at?: string
          device_type: string
          id?: string
          is_active?: boolean | null
          last_sync?: string | null
          refresh_token_encrypted?: string | null
          scopes_granted?: string[] | null
          source_platform?: string | null
          token_expiry?: string | null
          user_id: string
        }
        Update: {
          access_token_encrypted?: string | null
          created_at?: string
          device_type?: string
          id?: string
          is_active?: boolean | null
          last_sync?: string | null
          refresh_token_encrypted?: string | null
          scopes_granted?: string[] | null
          source_platform?: string | null
          token_expiry?: string | null
          user_id?: string
        }
        Relationships: []
      }
      episode_labels: {
        Row: {
          id: string
          label: string | null
          labeled_at: string | null
          labeled_by: string | null
          notes: string | null
          risk_window_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          label?: string | null
          labeled_at?: string | null
          labeled_by?: string | null
          notes?: string | null
          risk_window_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          label?: string | null
          labeled_at?: string | null
          labeled_by?: string | null
          notes?: string | null
          risk_window_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "episode_labels_risk_window_id_fkey"
            columns: ["risk_window_id"]
            isOneToOne: false
            referencedRelation: "risk_windows"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_events: {
        Row: {
          channel: string | null
          created_at: string
          follow_up_response: string | null
          follow_up_sent_at: string | null
          helpful: boolean | null
          id: string
          intervention_type: string | null
          message_text: string | null
          risk_window_id: string | null
          sent_at: string | null
          user_id: string
          user_opened: boolean | null
          user_response: string | null
          vibration_pattern: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string
          follow_up_response?: string | null
          follow_up_sent_at?: string | null
          helpful?: boolean | null
          id?: string
          intervention_type?: string | null
          message_text?: string | null
          risk_window_id?: string | null
          sent_at?: string | null
          user_id: string
          user_opened?: boolean | null
          user_response?: string | null
          vibration_pattern?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string
          follow_up_response?: string | null
          follow_up_sent_at?: string | null
          helpful?: boolean | null
          id?: string
          intervention_type?: string | null
          message_text?: string | null
          risk_window_id?: string | null
          sent_at?: string | null
          user_id?: string
          user_opened?: boolean | null
          user_response?: string | null
          vibration_pattern?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_intervention_risk_window"
            columns: ["risk_window_id"]
            isOneToOne: false
            referencedRelation: "risk_windows"
            referencedColumns: ["id"]
          },
        ]
      }
      personalisation_settings: {
        Row: {
          accent_color: string | null
          created_at: string
          crisis_contact_name: string | null
          crisis_contact_phone: string | null
          hide_exercise_metrics: boolean | null
          id: string
          intervention_message_1: string | null
          intervention_message_2: string | null
          intervention_message_3: string | null
          language: string | null
          message_tone: string | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sound_enabled: boolean | null
          sound_type: string | null
          sound_volume: number | null
          theme: string | null
          updated_at: string
          user_id: string
          vibration_intensity: number | null
          vibration_pattern: string | null
        }
        Insert: {
          accent_color?: string | null
          created_at?: string
          crisis_contact_name?: string | null
          crisis_contact_phone?: string | null
          hide_exercise_metrics?: boolean | null
          id?: string
          intervention_message_1?: string | null
          intervention_message_2?: string | null
          intervention_message_3?: string | null
          language?: string | null
          message_tone?: string | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sound_enabled?: boolean | null
          sound_type?: string | null
          sound_volume?: number | null
          theme?: string | null
          updated_at?: string
          user_id: string
          vibration_intensity?: number | null
          vibration_pattern?: string | null
        }
        Update: {
          accent_color?: string | null
          created_at?: string
          crisis_contact_name?: string | null
          crisis_contact_phone?: string | null
          hide_exercise_metrics?: boolean | null
          id?: string
          intervention_message_1?: string | null
          intervention_message_2?: string | null
          intervention_message_3?: string | null
          language?: string | null
          message_tone?: string | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sound_enabled?: boolean | null
          sound_type?: string | null
          sound_volume?: number | null
          theme?: string | null
          updated_at?: string
          user_id?: string
          vibration_intensity?: number | null
          vibration_pattern?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          consent_given: boolean | null
          consent_timestamp: string | null
          created_at: string
          full_name: string | null
          id: string
          notification_preferences: Json | null
          preferred_language: string | null
          theme_preference: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          consent_given?: boolean | null
          consent_timestamp?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          notification_preferences?: Json | null
          preferred_language?: string | null
          theme_preference?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          consent_given?: boolean | null
          consent_timestamp?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          notification_preferences?: Json | null
          preferred_language?: string | null
          theme_preference?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      risk_windows: {
        Row: {
          binge_risk_score: number | null
          confidence_level: string | null
          confidence_score: number | null
          confirmed_by_user: boolean | null
          created_at: string
          dominant_drivers: string[] | null
          ended_at: string | null
          id: string
          intervention_id: string | null
          intervention_sent: boolean | null
          purge_risk_score: number | null
          recommended_action: string | null
          started_at: string | null
          urge_risk_score: number | null
          user_feedback: string | null
          user_id: string
        }
        Insert: {
          binge_risk_score?: number | null
          confidence_level?: string | null
          confidence_score?: number | null
          confirmed_by_user?: boolean | null
          created_at?: string
          dominant_drivers?: string[] | null
          ended_at?: string | null
          id?: string
          intervention_id?: string | null
          intervention_sent?: boolean | null
          purge_risk_score?: number | null
          recommended_action?: string | null
          started_at?: string | null
          urge_risk_score?: number | null
          user_feedback?: string | null
          user_id: string
        }
        Update: {
          binge_risk_score?: number | null
          confidence_level?: string | null
          confidence_score?: number | null
          confirmed_by_user?: boolean | null
          created_at?: string
          dominant_drivers?: string[] | null
          ended_at?: string | null
          id?: string
          intervention_id?: string | null
          intervention_sent?: boolean | null
          purge_risk_score?: number | null
          recommended_action?: string | null
          started_at?: string | null
          urge_risk_score?: number | null
          user_feedback?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_windows_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "intervention_events"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_alerts: {
        Row: {
          cta_clicked: string | null
          emergency_contact_notified: boolean | null
          id: string
          message_shown: string | null
          resolved: boolean | null
          trigger_type: string | null
          triggered_at: string | null
          user_id: string
        }
        Insert: {
          cta_clicked?: string | null
          emergency_contact_notified?: boolean | null
          id?: string
          message_shown?: string | null
          resolved?: boolean | null
          trigger_type?: string | null
          triggered_at?: string | null
          user_id: string
        }
        Update: {
          cta_clicked?: string | null
          emergency_contact_notified?: boolean | null
          id?: string
          message_shown?: string | null
          resolved?: boolean | null
          trigger_type?: string | null
          triggered_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      self_reports: {
        Row: {
          anxiety_level: number | null
          binge_occurred: boolean | null
          created_at: string
          emotional_state: string[] | null
          id: string
          location_context: string | null
          loneliness_level: number | null
          meal_skipped: boolean | null
          notes: string | null
          overeating_occurred: boolean | null
          purge_occurred: boolean | null
          shame_level: number | null
          timestamp: string
          triggers: string[] | null
          urge_level: number | null
          user_id: string
        }
        Insert: {
          anxiety_level?: number | null
          binge_occurred?: boolean | null
          created_at?: string
          emotional_state?: string[] | null
          id?: string
          location_context?: string | null
          loneliness_level?: number | null
          meal_skipped?: boolean | null
          notes?: string | null
          overeating_occurred?: boolean | null
          purge_occurred?: boolean | null
          shame_level?: number | null
          timestamp?: string
          triggers?: string[] | null
          urge_level?: number | null
          user_id: string
        }
        Update: {
          anxiety_level?: number | null
          binge_occurred?: boolean | null
          created_at?: string
          emotional_state?: string[] | null
          id?: string
          location_context?: string | null
          loneliness_level?: number | null
          meal_skipped?: boolean | null
          notes?: string | null
          overeating_occurred?: boolean | null
          purge_occurred?: boolean | null
          shame_level?: number | null
          timestamp?: string
          triggers?: string[] | null
          urge_level?: number | null
          user_id?: string
        }
        Relationships: []
      }
      sensor_samples: {
        Row: {
          activity_state: string | null
          body_battery: number | null
          confidence: string | null
          created_at: string
          device_type: string | null
          gyro_event: string | null
          heart_rate: number | null
          hrv_sdnn: number | null
          ibi_ms: number | null
          id: string
          raw_payload_ref: string | null
          respiration_rate: number | null
          resting_heart_rate: number | null
          skin_temperature_delta: number | null
          sleep_state: string | null
          source_platform: string | null
          spo2: number | null
          steps: number | null
          stress_score: number | null
          timestamp: string
          user_id: string
        }
        Insert: {
          activity_state?: string | null
          body_battery?: number | null
          confidence?: string | null
          created_at?: string
          device_type?: string | null
          gyro_event?: string | null
          heart_rate?: number | null
          hrv_sdnn?: number | null
          ibi_ms?: number | null
          id?: string
          raw_payload_ref?: string | null
          respiration_rate?: number | null
          resting_heart_rate?: number | null
          skin_temperature_delta?: number | null
          sleep_state?: string | null
          source_platform?: string | null
          spo2?: number | null
          steps?: number | null
          stress_score?: number | null
          timestamp: string
          user_id: string
        }
        Update: {
          activity_state?: string | null
          body_battery?: number | null
          confidence?: string | null
          created_at?: string
          device_type?: string | null
          gyro_event?: string | null
          heart_rate?: number | null
          hrv_sdnn?: number | null
          ibi_ms?: number | null
          id?: string
          raw_payload_ref?: string | null
          respiration_rate?: number | null
          resting_heart_rate?: number | null
          skin_temperature_delta?: number | null
          sleep_state?: string | null
          source_platform?: string | null
          spo2?: number | null
          steps?: number | null
          stress_score?: number | null
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      specialist_notes: {
        Row: {
          client_id: string
          created_at: string
          id: string
          note_text: string | null
          note_type: string | null
          specialist_id: string
          visible_to_client: boolean | null
          week_reference: string | null
          written_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          note_text?: string | null
          note_type?: string | null
          specialist_id: string
          visible_to_client?: boolean | null
          week_reference?: string | null
          written_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          note_text?: string | null
          note_type?: string | null
          specialist_id?: string
          visible_to_client?: boolean | null
          week_reference?: string | null
          written_at?: string | null
        }
        Relationships: []
      }
      specialist_profiles: {
        Row: {
          bio: string | null
          client_ids: string[] | null
          created_at: string
          id: string
          institution: string | null
          license_number: string | null
          specialty: string[] | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          client_ids?: string[] | null
          created_at?: string
          id: string
          institution?: string | null
          license_number?: string | null
          specialty?: string[] | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          client_ids?: string[] | null
          created_at?: string
          id?: string
          institution?: string | null
          license_number?: string | null
          specialty?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      specialist_sessions: {
        Row: {
          client_id: string
          created_at: string
          duration_minutes: number | null
          goals_discussed: string[] | null
          id: string
          next_session_at: string | null
          notes: string | null
          scheduled_at: string | null
          session_type: string | null
          specialist_id: string
          status: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          duration_minutes?: number | null
          goals_discussed?: string[] | null
          id?: string
          next_session_at?: string | null
          notes?: string | null
          scheduled_at?: string | null
          session_type?: string | null
          specialist_id: string
          status?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          duration_minutes?: number | null
          goals_discussed?: string[] | null
          id?: string
          next_session_at?: string | null
          notes?: string | null
          scheduled_at?: string | null
          session_type?: string | null
          specialist_id?: string
          status?: string | null
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "client" | "specialist"
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
      app_role: ["client", "specialist"],
    },
  },
} as const
