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
          externality_warning: boolean | null
          id: string
          igma_flags: Json | null
          igma_interpretation: Json | null
          marketing_blocked: boolean | null
          next_review_recommended_at: string | null
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
          externality_warning?: boolean | null
          id?: string
          igma_flags?: Json | null
          igma_interpretation?: Json | null
          marketing_blocked?: boolean | null
          next_review_recommended_at?: string | null
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
          externality_warning?: boolean | null
          id?: string
          igma_flags?: Json | null
          igma_interpretation?: Json | null
          marketing_blocked?: boolean | null
          next_review_recommended_at?: string | null
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
      diagnosis_data_snapshots: {
        Row: {
          assessment_id: string
          confidence_level: number
          created_at: string
          id: string
          indicator_code: string
          org_id: string
          reference_year: number | null
          source_code: string
          value_used: number | null
          value_used_text: string | null
          was_manually_adjusted: boolean
        }
        Insert: {
          assessment_id: string
          confidence_level?: number
          created_at?: string
          id?: string
          indicator_code: string
          org_id: string
          reference_year?: number | null
          source_code: string
          value_used?: number | null
          value_used_text?: string | null
          was_manually_adjusted?: boolean
        }
        Update: {
          assessment_id?: string
          confidence_level?: number
          created_at?: string
          id?: string
          indicator_code?: string
          org_id?: string
          reference_year?: number | null
          source_code?: string
          value_used?: number | null
          value_used_text?: string | null
          was_manually_adjusted?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "diagnosis_data_snapshots_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnosis_data_snapshots_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      edu_courses: {
        Row: {
          audience: Database["public"]["Enums"]["target_agent"] | null
          certification: string | null
          code: string
          created_at: string
          description: string | null
          id: string
          objective: string | null
          org_id: string | null
          pillar: Database["public"]["Enums"]["pillar_type"]
          suggested_hours: number | null
          title: string
          url: string | null
        }
        Insert: {
          audience?: Database["public"]["Enums"]["target_agent"] | null
          certification?: string | null
          code: string
          created_at?: string
          description?: string | null
          id?: string
          objective?: string | null
          org_id?: string | null
          pillar: Database["public"]["Enums"]["pillar_type"]
          suggested_hours?: number | null
          title: string
          url?: string | null
        }
        Update: {
          audience?: Database["public"]["Enums"]["target_agent"] | null
          certification?: string | null
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          objective?: string | null
          org_id?: string | null
          pillar?: Database["public"]["Enums"]["pillar_type"]
          suggested_hours?: number | null
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "edu_courses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      edu_indicator_training_map: {
        Row: {
          created_at: string
          id: string
          indicator_code: string
          interpretation_trigger: string | null
          pillar: string
          priority: number
          reason_template: string
          status_trigger: Json
          training_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          indicator_code: string
          interpretation_trigger?: string | null
          pillar: string
          priority?: number
          reason_template?: string
          status_trigger?: Json
          training_id: string
        }
        Update: {
          created_at?: string
          id?: string
          indicator_code?: string
          interpretation_trigger?: string | null
          pillar?: string
          priority?: number
          reason_template?: string
          status_trigger?: Json
          training_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "edu_indicator_training_map_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "edu_trainings"
            referencedColumns: ["training_id"]
          },
        ]
      }
      edu_lives: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          org_id: string | null
          tags: Json
          title: string
          url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          org_id?: string | null
          tags?: Json
          title: string
          url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          org_id?: string | null
          tags?: Json
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "edu_lives_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      edu_module_lives: {
        Row: {
          created_at: string
          id: string
          live_id: string
          live_type: Database["public"]["Enums"]["live_type"]
          module_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          live_id: string
          live_type?: Database["public"]["Enums"]["live_type"]
          module_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          live_id?: string
          live_type?: Database["public"]["Enums"]["live_type"]
          module_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "edu_module_lives_live_id_fkey"
            columns: ["live_id"]
            isOneToOne: false
            referencedRelation: "edu_lives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edu_module_lives_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "edu_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      edu_modules: {
        Row: {
          activities: Json
          course_id: string
          created_at: string
          id: string
          module_index: number
          title: string
        }
        Insert: {
          activities?: Json
          course_id: string
          created_at?: string
          id?: string
          module_index?: number
          title: string
        }
        Update: {
          activities?: Json
          course_id?: string
          created_at?: string
          id?: string
          module_index?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "edu_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "edu_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      edu_track_courses: {
        Row: {
          course_id: string
          created_at: string
          id: string
          sort_order: number
          track_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          sort_order?: number
          track_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          sort_order?: number
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "edu_track_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "edu_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edu_track_courses_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "edu_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      edu_track_trainings: {
        Row: {
          created_at: string
          id: string
          sort_order: number
          track_id: string
          training_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sort_order?: number
          track_id: string
          training_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sort_order?: number
          track_id?: string
          training_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "edu_track_trainings_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "edu_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      edu_tracks: {
        Row: {
          audience: Database["public"]["Enums"]["target_agent"] | null
          created_at: string
          delivery: string | null
          description: string | null
          id: string
          name: string
          objective: string | null
          org_id: string | null
        }
        Insert: {
          audience?: Database["public"]["Enums"]["target_agent"] | null
          created_at?: string
          delivery?: string | null
          description?: string | null
          id?: string
          name: string
          objective?: string | null
          org_id?: string | null
        }
        Update: {
          audience?: Database["public"]["Enums"]["target_agent"] | null
          created_at?: string
          delivery?: string | null
          description?: string | null
          id?: string
          name?: string
          objective?: string | null
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "edu_tracks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      edu_trainings: {
        Row: {
          active: boolean
          aliases: Json
          course_code: string | null
          created_at: string
          level: string | null
          modules: Json
          objective: string | null
          org_id: string | null
          pillar: string
          source: string | null
          target_audience: string | null
          title: string
          training_id: string
          type: string
        }
        Insert: {
          active?: boolean
          aliases?: Json
          course_code?: string | null
          created_at?: string
          level?: string | null
          modules?: Json
          objective?: string | null
          org_id?: string | null
          pillar: string
          source?: string | null
          target_audience?: string | null
          title: string
          training_id: string
          type: string
        }
        Update: {
          active?: boolean
          aliases?: Json
          course_code?: string | null
          created_at?: string
          level?: string | null
          modules?: Json
          objective?: string | null
          org_id?: string | null
          pillar?: string
          source?: string | null
          target_audience?: string | null
          title?: string
          training_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "edu_trainings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      external_data_sources: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          trust_level_default: number
          update_frequency: string | null
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          trust_level_default?: number
          update_frequency?: string | null
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          trust_level_default?: number
          update_frequency?: string | null
        }
        Relationships: []
      }
      external_indicator_values: {
        Row: {
          collected_at: string
          collection_method: Database["public"]["Enums"]["external_collection_method"]
          confidence_level: number
          created_at: string
          id: string
          indicator_code: string
          municipality_ibge_code: string
          notes: string | null
          org_id: string
          raw_value: number | null
          raw_value_text: string | null
          reference_year: number | null
          source_code: string
          validated: boolean
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          collected_at?: string
          collection_method?: Database["public"]["Enums"]["external_collection_method"]
          confidence_level?: number
          created_at?: string
          id?: string
          indicator_code: string
          municipality_ibge_code: string
          notes?: string | null
          org_id: string
          raw_value?: number | null
          raw_value_text?: string | null
          reference_year?: number | null
          source_code: string
          validated?: boolean
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          collected_at?: string
          collection_method?: Database["public"]["Enums"]["external_collection_method"]
          confidence_level?: number
          created_at?: string
          id?: string
          indicator_code?: string
          municipality_ibge_code?: string
          notes?: string | null
          org_id?: string
          raw_value?: number | null
          raw_value_text?: string | null
          reference_year?: number | null
          source_code?: string
          validated?: boolean
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_indicator_values_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_indicator_values_source_code_fkey"
            columns: ["source_code"]
            isOneToOne: false
            referencedRelation: "external_data_sources"
            referencedColumns: ["code"]
          },
        ]
      }
      igma_interpretation_history: {
        Row: {
          allowed_actions: string[]
          assessment_id: string
          blocked_actions: string[]
          created_at: string
          flags: string[]
          id: string
          interpretation_type: string | null
          org_id: string
          pillar_context: Json
          ui_messages: Json
        }
        Insert: {
          allowed_actions?: string[]
          assessment_id: string
          blocked_actions?: string[]
          created_at?: string
          flags?: string[]
          id?: string
          interpretation_type?: string | null
          org_id: string
          pillar_context?: Json
          ui_messages?: Json
        }
        Update: {
          allowed_actions?: string[]
          assessment_id?: string
          blocked_actions?: string[]
          created_at?: string
          flags?: string[]
          id?: string
          interpretation_type?: string | null
          org_id?: string
          pillar_context?: Json
          ui_messages?: Json
        }
        Relationships: [
          {
            foreignKeyName: "igma_interpretation_history_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "igma_interpretation_history_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      indicator_course_map: {
        Row: {
          course_id: string
          created_at: string
          id: string
          indicator_id: string
          weight: number
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          indicator_id: string
          weight?: number
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          indicator_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "indicator_course_map_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "edu_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicator_course_map_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      indicator_live_map: {
        Row: {
          created_at: string
          id: string
          indicator_id: string
          live_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          indicator_id: string
          live_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          id?: string
          indicator_id?: string
          live_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "indicator_live_map_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicator_live_map_live_id_fkey"
            columns: ["live_id"]
            isOneToOne: false
            referencedRelation: "edu_lives"
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
          intersectoral_dependency: boolean | null
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
          intersectoral_dependency?: boolean | null
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
          intersectoral_dependency?: boolean | null
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
      learning_recommendations: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["recommendation_entity_type"]
          id: string
          reasons: Json
          run_id: string
          score: number
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["recommendation_entity_type"]
          id?: string
          reasons?: Json
          run_id: string
          score?: number
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["recommendation_entity_type"]
          id?: string
          reasons?: Json
          run_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "learning_recommendations_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "learning_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_runs: {
        Row: {
          created_at: string
          id: string
          inputs: Json
          org_id: string
          territory_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inputs?: Json
          org_id: string
          territory_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inputs?: Json
          org_id?: string
          territory_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_runs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_runs_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "destinations"
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
      user_training_progress: {
        Row: {
          completed_at: string
          created_at: string
          id: string
          track_id: string
          training_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          id?: string
          track_id: string
          training_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          id?: string
          track_id?: string
          training_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_training_progress_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "edu_tracks"
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
      external_collection_method: "AUTOMATIC" | "BATCH" | "MANUAL"
      indicator_direction: "HIGH_IS_BETTER" | "LOW_IS_BETTER"
      live_type: "primary" | "case" | "complementary"
      normalization_type: "MIN_MAX" | "BANDS" | "BINARY"
      pillar_type: "RA" | "OE" | "AO"
      recommendation_entity_type: "course" | "live" | "track"
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
      external_collection_method: ["AUTOMATIC", "BATCH", "MANUAL"],
      indicator_direction: ["HIGH_IS_BETTER", "LOW_IS_BETTER"],
      live_type: ["primary", "case", "complementary"],
      normalization_type: ["MIN_MAX", "BANDS", "BINARY"],
      pillar_type: ["RA", "OE", "AO"],
      recommendation_entity_type: ["course", "live", "track"],
      severity_type: ["CRITICO", "MODERADO", "BOM"],
      target_agent: ["GESTORES", "TECNICOS", "TRADE"],
      territorial_interpretation: ["ESTRUTURAL", "GESTAO", "ENTREGA"],
    },
  },
} as const
