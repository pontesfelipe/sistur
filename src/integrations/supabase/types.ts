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
      action_plans: {
        Row: {
          assessment_id: string
          completed_at: string | null
          completion_notes: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          linked_issue_id: string | null
          linked_prescription_id: string | null
          org_id: string
          owner: string | null
          pillar: string | null
          priority: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assessment_id: string
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          linked_issue_id?: string | null
          linked_prescription_id?: string | null
          org_id: string
          owner?: string | null
          pillar?: string | null
          priority?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          linked_issue_id?: string | null
          linked_prescription_id?: string | null
          org_id?: string
          owner?: string | null
          pillar?: string | null
          priority?: number | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_plans_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_plans_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "public_destination_summary"
            referencedColumns: ["latest_assessment_id"]
          },
          {
            foreignKeyName: "action_plans_linked_issue_id_fkey"
            columns: ["linked_issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_plans_linked_prescription_id_fkey"
            columns: ["linked_prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_plans_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
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
            foreignKeyName: "alerts_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "public_destination_summary"
            referencedColumns: ["latest_assessment_id"]
          },
          {
            foreignKeyName: "alerts_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "public_destination_summary"
            referencedColumns: ["destination_id"]
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
          governance_block: boolean | null
          id: string
          igma_flags: Json | null
          igma_interpretation: Json | null
          marketing_blocked: boolean | null
          next_review_recommended_at: string | null
          org_id: string
          period_end: string | null
          period_start: string | null
          ra_limitation: boolean | null
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
          governance_block?: boolean | null
          id?: string
          igma_flags?: Json | null
          igma_interpretation?: Json | null
          marketing_blocked?: boolean | null
          next_review_recommended_at?: string | null
          org_id: string
          period_end?: string | null
          period_start?: string | null
          ra_limitation?: boolean | null
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
          governance_block?: boolean | null
          id?: string
          igma_flags?: Json | null
          igma_interpretation?: Json | null
          marketing_blocked?: boolean | null
          next_review_recommended_at?: string | null
          org_id?: string
          period_end?: string | null
          period_start?: string | null
          ra_limitation?: boolean | null
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
            foreignKeyName: "assessments_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "public_destination_summary"
            referencedColumns: ["destination_id"]
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
      community_feedback: {
        Row: {
          age_group: string | null
          assessment_id: string | null
          community_member_id: string | null
          concerns: string[] | null
          created_at: string
          cultural_preservation_score: number | null
          destination_id: string
          environmental_concern_level: number | null
          id: string
          neighborhood: string | null
          occupation_sector: string | null
          org_id: string
          priorities: string[] | null
          quality_of_life_score: number | null
          submitted_at: string
          suggestions: string[] | null
          tourism_impact_perception: string | null
        }
        Insert: {
          age_group?: string | null
          assessment_id?: string | null
          community_member_id?: string | null
          concerns?: string[] | null
          created_at?: string
          cultural_preservation_score?: number | null
          destination_id: string
          environmental_concern_level?: number | null
          id?: string
          neighborhood?: string | null
          occupation_sector?: string | null
          org_id: string
          priorities?: string[] | null
          quality_of_life_score?: number | null
          submitted_at?: string
          suggestions?: string[] | null
          tourism_impact_perception?: string | null
        }
        Update: {
          age_group?: string | null
          assessment_id?: string | null
          community_member_id?: string | null
          concerns?: string[] | null
          created_at?: string
          cultural_preservation_score?: number | null
          destination_id?: string
          environmental_concern_level?: number | null
          id?: string
          neighborhood?: string | null
          occupation_sector?: string | null
          org_id?: string
          priorities?: string[] | null
          quality_of_life_score?: number | null
          submitted_at?: string
          suggestions?: string[] | null
          tourism_impact_perception?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_feedback_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_feedback_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "public_destination_summary"
            referencedColumns: ["latest_assessment_id"]
          },
          {
            foreignKeyName: "community_feedback_community_member_id_fkey"
            columns: ["community_member_id"]
            isOneToOne: false
            referencedRelation: "stakeholder_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_feedback_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_feedback_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "public_destination_summary"
            referencedColumns: ["destination_id"]
          },
          {
            foreignKeyName: "community_feedback_org_id_fkey"
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
      destination_certifications: {
        Row: {
          ao_score: number
          assessment_id: string
          badge_url: string | null
          certification_level: string
          certified_at: string
          created_at: string
          destination_id: string
          expires_at: string | null
          id: string
          is_active: boolean
          oe_score: number
          org_id: string
          previous_certification_id: string | null
          ra_score: number
          territorial_impact_index: number
        }
        Insert: {
          ao_score: number
          assessment_id: string
          badge_url?: string | null
          certification_level: string
          certified_at?: string
          created_at?: string
          destination_id: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          oe_score: number
          org_id: string
          previous_certification_id?: string | null
          ra_score: number
          territorial_impact_index: number
        }
        Update: {
          ao_score?: number
          assessment_id?: string
          badge_url?: string | null
          certification_level?: string
          certified_at?: string
          created_at?: string
          destination_id?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          oe_score?: number
          org_id?: string
          previous_certification_id?: string | null
          ra_score?: number
          territorial_impact_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "destination_certifications_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "destination_certifications_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "public_destination_summary"
            referencedColumns: ["latest_assessment_id"]
          },
          {
            foreignKeyName: "destination_certifications_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "destination_certifications_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "public_destination_summary"
            referencedColumns: ["destination_id"]
          },
          {
            foreignKeyName: "destination_certifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "destination_certifications_previous_certification_id_fkey"
            columns: ["previous_certification_id"]
            isOneToOne: false
            referencedRelation: "destination_certifications"
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
            foreignKeyName: "diagnosis_data_snapshots_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "public_destination_summary"
            referencedColumns: ["latest_assessment_id"]
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
      edu_enrollments: {
        Row: {
          completed_at: string | null
          created_at: string
          enrolled_at: string
          id: string
          status: string
          trail_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          enrolled_at?: string
          id?: string
          status?: string
          trail_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          enrolled_at?: string
          id?: string
          status?: string
          trail_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "edu_enrollments_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "edu_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      edu_events: {
        Row: {
          created_at: string
          event_type: string
          event_value: Json | null
          id: string
          trail_id: string | null
          training_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          event_value?: Json | null
          id?: string
          trail_id?: string | null
          training_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          event_value?: Json | null
          id?: string
          trail_id?: string | null
          training_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "edu_events_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "edu_tracks"
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
      edu_progress: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          id: string
          last_activity_at: string
          progress_percent: number
          started_at: string
          trail_id: string | null
          training_id: string
          user_id: string
          watch_seconds: number
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          last_activity_at?: string
          progress_percent?: number
          started_at?: string
          trail_id?: string | null
          training_id: string
          user_id: string
          watch_seconds?: number
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          last_activity_at?: string
          progress_percent?: number
          started_at?: string
          trail_id?: string | null
          training_id?: string
          user_id?: string
          watch_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "edu_progress_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "edu_tracks"
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
          required: boolean | null
          sort_order: number
          track_id: string
          training_id: string
          unlock_rule: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          required?: boolean | null
          sort_order?: number
          track_id: string
          training_id: string
          unlock_rule?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          required?: boolean | null
          sort_order?: number
          track_id?: string
          training_id?: string
          unlock_rule?: Json | null
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
          active: boolean | null
          audience: Database["public"]["Enums"]["target_agent"] | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          delivery: string | null
          description: string | null
          id: string
          name: string
          objective: string | null
          org_id: string | null
          published_at: string | null
          slug: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          audience?: Database["public"]["Enums"]["target_agent"] | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          delivery?: string | null
          description?: string | null
          id?: string
          name: string
          objective?: string | null
          org_id?: string | null
          published_at?: string | null
          slug?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          audience?: Database["public"]["Enums"]["target_agent"] | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          delivery?: string | null
          description?: string | null
          id?: string
          name?: string
          objective?: string | null
          org_id?: string | null
          published_at?: string | null
          slug?: string | null
          status?: string | null
          updated_at?: string | null
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
          created_by: string | null
          description: string | null
          duration_minutes: number | null
          free_preview_seconds: number | null
          ingestion_confidence: number | null
          ingestion_metadata: Json | null
          ingestion_source: string | null
          language: string | null
          level: string | null
          materials: Json | null
          modules: Json
          objective: string | null
          objectives: string | null
          org_id: string | null
          pillar: string
          published_at: string | null
          slug: string | null
          source: string | null
          status: string | null
          tags: Json | null
          target_audience: string | null
          thumbnail_url: string | null
          title: string
          training_id: string
          type: string
          updated_at: string | null
          video_asset: Json | null
          video_provider: string | null
          video_url: string | null
        }
        Insert: {
          active?: boolean
          aliases?: Json
          course_code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          free_preview_seconds?: number | null
          ingestion_confidence?: number | null
          ingestion_metadata?: Json | null
          ingestion_source?: string | null
          language?: string | null
          level?: string | null
          materials?: Json | null
          modules?: Json
          objective?: string | null
          objectives?: string | null
          org_id?: string | null
          pillar: string
          published_at?: string | null
          slug?: string | null
          source?: string | null
          status?: string | null
          tags?: Json | null
          target_audience?: string | null
          thumbnail_url?: string | null
          title: string
          training_id: string
          type: string
          updated_at?: string | null
          video_asset?: Json | null
          video_provider?: string | null
          video_url?: string | null
        }
        Update: {
          active?: boolean
          aliases?: Json
          course_code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          free_preview_seconds?: number | null
          ingestion_confidence?: number | null
          ingestion_metadata?: Json | null
          ingestion_source?: string | null
          language?: string | null
          level?: string | null
          materials?: Json | null
          modules?: Json
          objective?: string | null
          objectives?: string | null
          org_id?: string | null
          pillar?: string
          published_at?: string | null
          slug?: string | null
          source?: string | null
          status?: string | null
          tags?: Json | null
          target_audience?: string | null
          thumbnail_url?: string | null
          title?: string
          training_id?: string
          type?: string
          updated_at?: string | null
          video_asset?: Json | null
          video_provider?: string | null
          video_url?: string | null
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
      entrepreneur_profiles: {
        Row: {
          business_description: string | null
          business_name: string | null
          business_type: string
          created_at: string
          destinations_of_interest: string[] | null
          expansion_interests: Json | null
          id: string
          org_id: string
          stakeholder_profile_id: string
          sustainability_commitment: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          business_description?: string | null
          business_name?: string | null
          business_type: string
          created_at?: string
          destinations_of_interest?: string[] | null
          expansion_interests?: Json | null
          id?: string
          org_id: string
          stakeholder_profile_id: string
          sustainability_commitment?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          business_description?: string | null
          business_name?: string | null
          business_type?: string
          created_at?: string
          destinations_of_interest?: string[] | null
          expansion_interests?: Json | null
          id?: string
          org_id?: string
          stakeholder_profile_id?: string
          sustainability_commitment?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entrepreneur_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrepreneur_profiles_stakeholder_profile_id_fkey"
            columns: ["stakeholder_profile_id"]
            isOneToOne: true
            referencedRelation: "stakeholder_profiles"
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
      generated_reports: {
        Row: {
          assessment_id: string
          created_at: string
          created_by: string
          destination_name: string
          id: string
          org_id: string
          report_content: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          created_by: string
          destination_name: string
          id?: string
          org_id: string
          report_content: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          created_by?: string
          destination_name?: string
          id?: string
          org_id?: string
          report_content?: string
        }
        Relationships: []
      }
      igma_composite_rules: {
        Row: {
          component_code: string
          composite_code: string
          created_at: string
          id: string
          transform: string
          weight: number
        }
        Insert: {
          component_code: string
          composite_code: string
          created_at?: string
          id?: string
          transform?: string
          weight?: number
        }
        Update: {
          component_code?: string
          composite_code?: string
          created_at?: string
          id?: string
          transform?: string
          weight?: number
        }
        Relationships: []
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
            foreignKeyName: "igma_interpretation_history_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "public_destination_summary"
            referencedColumns: ["latest_assessment_id"]
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
            foreignKeyName: "indicator_scores_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "public_destination_summary"
            referencedColumns: ["latest_assessment_id"]
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
            foreignKeyName: "indicator_values_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "public_destination_summary"
            referencedColumns: ["latest_assessment_id"]
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
      investment_interests: {
        Row: {
          created_at: string
          id: string
          interest_level: string
          investor_profile_id: string
          notes: string | null
          opportunity_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interest_level: string
          investor_profile_id: string
          notes?: string | null
          opportunity_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interest_level?: string
          investor_profile_id?: string
          notes?: string | null
          opportunity_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_interests_investor_profile_id_fkey"
            columns: ["investor_profile_id"]
            isOneToOne: false
            referencedRelation: "investor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investment_interests_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "investment_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_opportunities: {
        Row: {
          assessment_id: string
          blocked_by_igma: boolean
          blocking_reason: string | null
          completed_at: string | null
          created_at: string
          data_package_url: string | null
          description: string
          destination_id: string
          expected_roi: number | null
          funded_at: string | null
          id: string
          igma_approved: boolean
          impact_focus: string[] | null
          investment_type: string
          org_id: string
          projected_ao_improvement: number | null
          projected_oe_improvement: number | null
          projected_ra_improvement: number | null
          published_at: string | null
          required_capital: number
          risk_assessment: Json | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assessment_id: string
          blocked_by_igma?: boolean
          blocking_reason?: string | null
          completed_at?: string | null
          created_at?: string
          data_package_url?: string | null
          description: string
          destination_id: string
          expected_roi?: number | null
          funded_at?: string | null
          id?: string
          igma_approved?: boolean
          impact_focus?: string[] | null
          investment_type: string
          org_id: string
          projected_ao_improvement?: number | null
          projected_oe_improvement?: number | null
          projected_ra_improvement?: number | null
          published_at?: string | null
          required_capital: number
          risk_assessment?: Json | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          blocked_by_igma?: boolean
          blocking_reason?: string | null
          completed_at?: string | null
          created_at?: string
          data_package_url?: string | null
          description?: string
          destination_id?: string
          expected_roi?: number | null
          funded_at?: string | null
          id?: string
          igma_approved?: boolean
          impact_focus?: string[] | null
          investment_type?: string
          org_id?: string
          projected_ao_improvement?: number | null
          projected_oe_improvement?: number | null
          projected_ra_improvement?: number | null
          published_at?: string | null
          required_capital?: number
          risk_assessment?: Json | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_opportunities_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investment_opportunities_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "public_destination_summary"
            referencedColumns: ["latest_assessment_id"]
          },
          {
            foreignKeyName: "investment_opportunities_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investment_opportunities_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "public_destination_summary"
            referencedColumns: ["destination_id"]
          },
          {
            foreignKeyName: "investment_opportunities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_profiles: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          geographic_scope: string[] | null
          id: string
          impact_focus: string[] | null
          investment_thesis: Json | null
          investor_type: string
          org_id: string
          preferred_contact_method: string | null
          stakeholder_profile_id: string
          ticket_size_max: number | null
          ticket_size_min: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          geographic_scope?: string[] | null
          id?: string
          impact_focus?: string[] | null
          investment_thesis?: Json | null
          investor_type: string
          org_id: string
          preferred_contact_method?: string | null
          stakeholder_profile_id: string
          ticket_size_max?: number | null
          ticket_size_min?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          geographic_scope?: string[] | null
          id?: string
          impact_focus?: string[] | null
          investment_thesis?: Json | null
          investor_type?: string
          org_id?: string
          preferred_contact_method?: string | null
          stakeholder_profile_id?: string
          ticket_size_max?: number | null
          ticket_size_min?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_profiles_stakeholder_profile_id_fkey"
            columns: ["stakeholder_profile_id"]
            isOneToOne: true
            referencedRelation: "stakeholder_profiles"
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
            foreignKeyName: "issues_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "public_destination_summary"
            referencedColumns: ["latest_assessment_id"]
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
          {
            foreignKeyName: "learning_runs_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "public_destination_summary"
            referencedColumns: ["destination_id"]
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
            foreignKeyName: "pillar_scores_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "public_destination_summary"
            referencedColumns: ["latest_assessment_id"]
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
            foreignKeyName: "prescription_cycles_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "public_destination_summary"
            referencedColumns: ["latest_assessment_id"]
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
            foreignKeyName: "prescriptions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "public_destination_summary"
            referencedColumns: ["latest_assessment_id"]
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
          approval_requested_at: string | null
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          org_id: string
          pending_approval: boolean | null
          system_access:
            | Database["public"]["Enums"]["system_access_type"]
            | null
          updated_at: string
          user_id: string
          viewing_demo_org_id: string | null
        }
        Insert: {
          approval_requested_at?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          org_id: string
          pending_approval?: boolean | null
          system_access?:
            | Database["public"]["Enums"]["system_access_type"]
            | null
          updated_at?: string
          user_id: string
          viewing_demo_org_id?: string | null
        }
        Update: {
          approval_requested_at?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          org_id?: string
          pending_approval?: boolean | null
          system_access?:
            | Database["public"]["Enums"]["system_access_type"]
            | null
          updated_at?: string
          user_id?: string
          viewing_demo_org_id?: string | null
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
            foreignKeyName: "recommendations_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "public_destination_summary"
            referencedColumns: ["latest_assessment_id"]
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
      stakeholder_profiles: {
        Row: {
          created_at: string
          id: string
          org_id: string
          profile_data: Json
          stakeholder_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          profile_data?: Json
          stakeholder_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          profile_data?: Json
          stakeholder_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stakeholder_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      territorial_impact_scores: {
        Row: {
          assessment_id: string
          calculated_at: string
          calculation_method: string | null
          certification_eligible: boolean
          certification_level: string | null
          destination_id: string
          economic_impact: number
          environmental_impact: number
          esg_score: number | null
          id: string
          institutional_impact: number
          org_id: string
          sdg_alignments: number[] | null
          social_impact: number
          territorial_impact_index: number
        }
        Insert: {
          assessment_id: string
          calculated_at?: string
          calculation_method?: string | null
          certification_eligible?: boolean
          certification_level?: string | null
          destination_id: string
          economic_impact: number
          environmental_impact: number
          esg_score?: number | null
          id?: string
          institutional_impact: number
          org_id: string
          sdg_alignments?: number[] | null
          social_impact: number
          territorial_impact_index: number
        }
        Update: {
          assessment_id?: string
          calculated_at?: string
          calculation_method?: string | null
          certification_eligible?: boolean
          certification_level?: string | null
          destination_id?: string
          economic_impact?: number
          environmental_impact?: number
          esg_score?: number | null
          id?: string
          institutional_impact?: number
          org_id?: string
          sdg_alignments?: number[] | null
          social_impact?: number
          territorial_impact_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "territorial_impact_scores_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: true
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territorial_impact_scores_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: true
            referencedRelation: "public_destination_summary"
            referencedColumns: ["latest_assessment_id"]
          },
          {
            foreignKeyName: "territorial_impact_scores_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territorial_impact_scores_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "public_destination_summary"
            referencedColumns: ["destination_id"]
          },
          {
            foreignKeyName: "territorial_impact_scores_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      traveler_profiles: {
        Row: {
          created_at: string
          destinations_saved: string[] | null
          destinations_visited: string[] | null
          id: string
          stakeholder_profile_id: string
          sustainability_priorities: string[] | null
          travel_preferences: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          destinations_saved?: string[] | null
          destinations_visited?: string[] | null
          id?: string
          stakeholder_profile_id: string
          sustainability_priorities?: string[] | null
          travel_preferences?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          destinations_saved?: string[] | null
          destinations_visited?: string[] | null
          id?: string
          stakeholder_profile_id?: string
          sustainability_priorities?: string[] | null
          travel_preferences?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "traveler_profiles_stakeholder_profile_id_fkey"
            columns: ["stakeholder_profile_id"]
            isOneToOne: true
            referencedRelation: "stakeholder_profiles"
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
      public_destination_summary: {
        Row: {
          certification_eligible: boolean | null
          certification_level: string | null
          destination_id: string | null
          economic_impact: number | null
          environmental_impact: number | null
          esg_score: number | null
          ibge_code: string | null
          indicator_count: number | null
          institutional_impact: number | null
          latest_assessment_date: string | null
          latest_assessment_id: string | null
          latitude: number | null
          longitude: number | null
          name: string | null
          pillar_scores: Json | null
          ready_for_visitors: boolean | null
          sdg_alignments: number[] | null
          social_impact: number | null
          territorial_impact_index: number | null
          uf: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_approve_user: { Args: { _user_id: string }; Returns: boolean }
      admin_get_all_users: {
        Args: never
        Returns: {
          email: string
          full_name: string
          org_id: string
          org_name: string
          role: Database["public"]["Enums"]["app_role"]
          system_access: Database["public"]["Enums"]["system_access_type"]
          user_id: string
        }[]
      }
      complete_user_onboarding:
        | {
            Args: {
              _role?: Database["public"]["Enums"]["app_role"]
              _system_access: Database["public"]["Enums"]["system_access_type"]
              _user_id: string
            }
            Returns: boolean
          }
        | {
            Args: { _role: string; _system_access: string; _user_id: string }
            Returns: boolean
          }
      get_effective_org_id: { Args: never; Returns: string }
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_system_access: {
        Args: {
          _access: Database["public"]["Enums"]["system_access_type"]
          _user_id: string
        }
        Returns: boolean
      }
      toggle_demo_mode: { Args: { _enable: boolean }; Returns: undefined }
      user_belongs_to_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "ADMIN" | "ANALYST" | "VIEWER" | "ESTUDANTE" | "PROFESSOR"
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
      system_access_type: "ERP" | "EDU"
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
      app_role: ["ADMIN", "ANALYST", "VIEWER", "ESTUDANTE", "PROFESSOR"],
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
      system_access_type: ["ERP", "EDU"],
      target_agent: ["GESTORES", "TECNICOS", "TRADE"],
      territorial_interpretation: ["ESTRUTURAL", "GESTAO", "ENTREGA"],
    },
  },
} as const
