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
      alerts: {
        Row: {
          alert_type: string
          assessment_id: string | null
          consecutive_cycles: number
          created_at: string
          destination_id: string
          id: string
          is_dismissed: boolean
          is_read: boolean
          message: string
          org_id: string
          pillar: Database["public"]["Enums"]["pillar_type"]
        }
        Insert: {
          alert_type?: string
          assessment_id?: string | null
          consecutive_cycles?: number
          created_at?: string
          destination_id: string
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          message: string
          org_id: string
          pillar: Database["public"]["Enums"]["pillar_type"]
        }
        Update: {
          alert_type?: string
          assessment_id?: string | null
          consecutive_cycles?: number
          created_at?: string
          destination_id?: string
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          message?: string
          org_id?: string
          pillar?: Database["public"]["Enums"]["pillar_type"]
        }
        Relationships: [
          {
            foreignKeyName: "alerts_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          algo_version: string
          calculated_at: string | null
          created_at: string
          destination_id: string
          id: string
          org_id: string
          period_end: string | null
          period_start: string | null
          status: Database["public"]["Enums"]["assessment_status"]
          title: string
          updated_at: string
        }
        Insert: {
          algo_version?: string
          calculated_at?: string | null
          created_at?: string
          destination_id: string
          id?: string
          org_id: string
          period_end?: string | null
          period_start?: string | null
          status?: Database["public"]["Enums"]["assessment_status"]
          title: string
          updated_at?: string
        }
        Update: {
          algo_version?: string
          calculated_at?: string | null
          created_at?: string
          destination_id?: string
          id?: string
          org_id?: string
          period_end?: string | null
          period_start?: string | null
          status?: Database["public"]["Enums"]["assessment_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          metadata: Json
          org_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          metadata?: Json
          org_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          org_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          level: Database["public"]["Enums"]["course_level"]
          org_id: string | null
          pillar: Database["public"]["Enums"]["pillar_type"] | null
          tags: Json
          target_agent: Database["public"]["Enums"]["target_agent"] | null
          theme: string | null
          title: string
          url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          level?: Database["public"]["Enums"]["course_level"]
          org_id?: string | null
          pillar?: Database["public"]["Enums"]["pillar_type"] | null
          tags?: Json
          target_agent?: Database["public"]["Enums"]["target_agent"] | null
          theme?: string | null
          title: string
          url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          level?: Database["public"]["Enums"]["course_level"]
          org_id?: string | null
          pillar?: Database["public"]["Enums"]["pillar_type"] | null
          tags?: Json
          target_agent?: Database["public"]["Enums"]["target_agent"] | null
          theme?: string | null
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      destinations: {
        Row: {
          created_at: string
          ibge_code: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          org_id: string
          uf: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          ibge_code?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          org_id: string
          uf?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          ibge_code?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          org_id?: string
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "destinations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      indicator_scores: {
        Row: {
          assessment_id: string
          computed_at: string
          id: string
          indicator_id: string
          max_ref_used: number | null
          min_ref_used: number | null
          org_id: string
          score: number
          weight_used: number | null
        }
        Insert: {
          assessment_id: string
          computed_at?: string
          id?: string
          indicator_id: string
          max_ref_used?: number | null
          min_ref_used?: number | null
          org_id: string
          score: number
          weight_used?: number | null
        }
        Update: {
          assessment_id?: string
          computed_at?: string
          id?: string
          indicator_id?: string
          max_ref_used?: number | null
          min_ref_used?: number | null
          org_id?: string
          score?: number
          weight_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "indicator_scores_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicator_scores_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicator_scores_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      indicator_values: {
        Row: {
          assessment_id: string
          collected_at: string
          created_at: string
          id: string
          indicator_id: string
          org_id: string
          reference_date: string | null
          source: string | null
          value_raw: number | null
          value_text: string | null
        }
        Insert: {
          assessment_id: string
          collected_at?: string
          created_at?: string
          id?: string
          indicator_id: string
          org_id: string
          reference_date?: string | null
          source?: string | null
          value_raw?: number | null
          value_text?: string | null
        }
        Update: {
          assessment_id?: string
          collected_at?: string
          created_at?: string
          id?: string
          indicator_id?: string
          org_id?: string
          reference_date?: string | null
          source?: string | null
          value_raw?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "indicator_values_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicator_values_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicator_values_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      indicators: {
        Row: {
          code: string
          collection_type: Database["public"]["Enums"]["collection_type"] | null
          created_at: string
          data_source: Database["public"]["Enums"]["data_source"] | null
          default_interpretation: string | null
          description: string | null
          direction: Database["public"]["Enums"]["indicator_direction"]
          edu_suggested_titles: Json
          id: string
          igma_dimension: string | null
          max_ref: number | null
          min_ref: number | null
          name: string
          normalization: Database["public"]["Enums"]["normalization_type"]
          notes: string | null
          org_id: string | null
          pillar: Database["public"]["Enums"]["pillar_type"]
          reference_date: string | null
          reliability_score: number | null
          source: string | null
          theme: string
          unit: string | null
          weight: number
        }
        Insert: {
          code: string
          collection_type?:
            | Database["public"]["Enums"]["collection_type"]
            | null
          created_at?: string
          data_source?: Database["public"]["Enums"]["data_source"] | null
          default_interpretation?: string | null
          description?: string | null
          direction?: Database["public"]["Enums"]["indicator_direction"]
          edu_suggested_titles?: Json
          id?: string
          igma_dimension?: string | null
          max_ref?: number | null
          min_ref?: number | null
          name: string
          normalization?: Database["public"]["Enums"]["normalization_type"]
          notes?: string | null
          org_id?: string | null
          pillar: Database["public"]["Enums"]["pillar_type"]
          reference_date?: string | null
          reliability_score?: number | null
          source?: string | null
          theme: string
          unit?: string | null
          weight?: number
        }
        Update: {
          code?: string
          collection_type?:
            | Database["public"]["Enums"]["collection_type"]
            | null
          created_at?: string
          data_source?: Database["public"]["Enums"]["data_source"] | null
          default_interpretation?: string | null
          description?: string | null
          direction?: Database["public"]["Enums"]["indicator_direction"]
          edu_suggested_titles?: Json
          id?: string
          igma_dimension?: string | null
          max_ref?: number | null
          min_ref?: number | null
          name?: string
          normalization?: Database["public"]["Enums"]["normalization_type"]
          notes?: string | null
          org_id?: string | null
          pillar?: Database["public"]["Enums"]["pillar_type"]
          reference_date?: string | null
          reliability_score?: number | null
          source?: string | null
          theme?: string
          unit?: string | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "indicators_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          assessment_id: string
          created_at: string
          evidence: Json
          id: string
          interpretation:
            | Database["public"]["Enums"]["territorial_interpretation"]
            | null
          org_id: string
          pillar: Database["public"]["Enums"]["pillar_type"]
          severity: Database["public"]["Enums"]["severity_type"]
          theme: string
          title: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          evidence?: Json
          id?: string
          interpretation?:
            | Database["public"]["Enums"]["territorial_interpretation"]
            | null
          org_id: string
          pillar: Database["public"]["Enums"]["pillar_type"]
          severity: Database["public"]["Enums"]["severity_type"]
          theme: string
          title: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          evidence?: Json
          id?: string
          interpretation?:
            | Database["public"]["Enums"]["territorial_interpretation"]
            | null
          org_id?: string
          pillar?: Database["public"]["Enums"]["pillar_type"]
          severity?: Database["public"]["Enums"]["severity_type"]
          theme?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "issues_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      orgs: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      pillar_scores: {
        Row: {
          assessment_id: string
          created_at: string
          id: string
          org_id: string
          pillar: Database["public"]["Enums"]["pillar_type"]
          score: number
          severity: Database["public"]["Enums"]["severity_type"]
        }
        Insert: {
          assessment_id: string
          created_at?: string
          id?: string
          org_id: string
          pillar: Database["public"]["Enums"]["pillar_type"]
          score: number
          severity: Database["public"]["Enums"]["severity_type"]
        }
        Update: {
          assessment_id?: string
          created_at?: string
          id?: string
          org_id?: string
          pillar?: Database["public"]["Enums"]["pillar_type"]
          score?: number
          severity?: Database["public"]["Enums"]["severity_type"]
        }
        Relationships: [
          {
            foreignKeyName: "pillar_scores_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pillar_scores_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_cycles: {
        Row: {
          assessment_id: string
          created_at: string
          current_score: number | null
          evolution_state: string | null
          id: string
          org_id: string
          prescription_id: string
          previous_score: number | null
        }
        Insert: {
          assessment_id: string
          created_at?: string
          current_score?: number | null
          evolution_state?: string | null
          id?: string
          org_id: string
          prescription_id: string
          previous_score?: number | null
        }
        Update: {
          assessment_id?: string
          created_at?: string
          current_score?: number | null
          evolution_state?: string | null
          id?: string
          org_id?: string
          prescription_id?: string
          previous_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prescription_cycles_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_cycles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_cycles_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          assessment_id: string
          course_id: string | null
          created_at: string
          cycle_number: number
          id: string
          indicator_id: string | null
          interpretation:
            | Database["public"]["Enums"]["territorial_interpretation"]
            | null
          issue_id: string | null
          justification: string
          org_id: string
          pillar: Database["public"]["Enums"]["pillar_type"]
          priority: number
          status: Database["public"]["Enums"]["severity_type"]
          target_agent: Database["public"]["Enums"]["target_agent"]
        }
        Insert: {
          assessment_id: string
          course_id?: string | null
          created_at?: string
          cycle_number?: number
          id?: string
          indicator_id?: string | null
          interpretation?:
            | Database["public"]["Enums"]["territorial_interpretation"]
            | null
          issue_id?: string | null
          justification: string
          org_id: string
          pillar: Database["public"]["Enums"]["pillar_type"]
          priority?: number
          status: Database["public"]["Enums"]["severity_type"]
          target_agent?: Database["public"]["Enums"]["target_agent"]
        }
        Update: {
          assessment_id?: string
          course_id?: string | null
          created_at?: string
          cycle_number?: number
          id?: string
          indicator_id?: string | null
          interpretation?:
            | Database["public"]["Enums"]["territorial_interpretation"]
            | null
          issue_id?: string | null
          justification?: string
          org_id?: string
          pillar?: Database["public"]["Enums"]["pillar_type"]
          priority?: number
          status?: Database["public"]["Enums"]["severity_type"]
          target_agent?: Database["public"]["Enums"]["target_agent"]
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          org_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          org_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          org_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendations: {
        Row: {
          assessment_id: string
          course_id: string | null
          created_at: string
          id: string
          issue_id: string | null
          org_id: string
          priority: number
          reason: string
        }
        Insert: {
          assessment_id: string
          course_id?: string | null
          created_at?: string
          id?: string
          issue_id?: string | null
          org_id: string
          priority?: number
          reason: string
        }
        Update: {
          assessment_id?: string
          course_id?: string | null
          created_at?: string
          id?: string
          issue_id?: string | null
          org_id?: string
          priority?: number
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_belongs_to_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "ADMIN" | "ANALYST" | "VIEWER"
      assessment_status: "DRAFT" | "DATA_READY" | "CALCULATED"
      collection_type: "AUTOMATICA" | "MANUAL" | "ESTIMADA"
      course_level: "BASICO" | "INTERMEDIARIO" | "AVANCADO"
      data_source: "IBGE" | "CADASTUR" | "PESQUISA_LOCAL" | "MANUAL" | "OUTRO"
      indicator_direction: "HIGH_IS_BETTER" | "LOW_IS_BETTER"
      normalization_type: "MIN_MAX" | "BANDS" | "BINARY"
      pillar_type: "RA" | "OE" | "AO"
      severity_type: "CRITICO" | "MODERADO" | "BOM"
      target_agent: "GESTORES" | "TECNICOS" | "TRADE"
      territorial_interpretation: "ESTRUTURAL" | "GESTAO" | "ENTREGA"
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
      app_role: ["ADMIN", "ANALYST", "VIEWER"],
      assessment_status: ["DRAFT", "DATA_READY", "CALCULATED"],
      collection_type: ["AUTOMATICA", "MANUAL", "ESTIMADA"],
      course_level: ["BASICO", "INTERMEDIARIO", "AVANCADO"],
      data_source: ["IBGE", "CADASTUR", "PESQUISA_LOCAL", "MANUAL", "OUTRO"],
      indicator_direction: ["HIGH_IS_BETTER", "LOW_IS_BETTER"],
      normalization_type: ["MIN_MAX", "BANDS", "BINARY"],
      pillar_type: ["RA", "OE", "AO"],
      severity_type: ["CRITICO", "MODERADO", "BOM"],
      target_agent: ["GESTORES", "TECNICOS", "TRADE"],
      territorial_interpretation: ["ESTRUTURAL", "GESTAO", "ENTREGA"],
    },
  },
} as const
