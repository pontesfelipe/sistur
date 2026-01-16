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
          creator_user_id: string | null
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
          visibility: string
        }
        Insert: {
          algo_version?: string
          calculated_at?: string | null
          created_at?: string
          creator_user_id?: string | null
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
          visibility?: string
        }
        Update: {
          algo_version?: string
          calculated_at?: string | null
          created_at?: string
          creator_user_id?: string | null
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
          visibility?: string
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
      beni_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          certificate_id: string
          certificate_type: string
          course_id: string | null
          created_at: string
          description: string | null
          exam_id: string | null
          expires_at: string | null
          hours_completed: number | null
          id: string
          issued_at: string
          metadata: Json | null
          org_id: string | null
          pdf_url: string | null
          pillar: string | null
          qr_data: string | null
          revoked_at: string | null
          revoked_reason: string | null
          score_pct: number | null
          status: string
          title: string
          track_id: string | null
          training_id: string | null
          user_email: string | null
          user_id: string
          user_name: string
          verification_code: string
        }
        Insert: {
          certificate_id: string
          certificate_type?: string
          course_id?: string | null
          created_at?: string
          description?: string | null
          exam_id?: string | null
          expires_at?: string | null
          hours_completed?: number | null
          id?: string
          issued_at?: string
          metadata?: Json | null
          org_id?: string | null
          pdf_url?: string | null
          pillar?: string | null
          qr_data?: string | null
          revoked_at?: string | null
          revoked_reason?: string | null
          score_pct?: number | null
          status?: string
          title: string
          track_id?: string | null
          training_id?: string | null
          user_email?: string | null
          user_id: string
          user_name: string
          verification_code: string
        }
        Update: {
          certificate_id?: string
          certificate_type?: string
          course_id?: string | null
          created_at?: string
          description?: string | null
          exam_id?: string | null
          expires_at?: string | null
          hours_completed?: number | null
          id?: string
          issued_at?: string
          metadata?: Json | null
          org_id?: string | null
          pdf_url?: string | null
          pillar?: string | null
          qr_data?: string | null
          revoked_at?: string | null
          revoked_reason?: string | null
          score_pct?: number | null
          status?: string
          title?: string
          track_id?: string | null
          training_id?: string | null
          user_email?: string | null
          user_id?: string
          user_name?: string
          verification_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lms_courses"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "certificates_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["exam_id"]
          },
          {
            foreignKeyName: "certificates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "edu_tracks"
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
      content_items: {
        Row: {
          abstract: string | null
          author: string
          content_id: string
          content_type: Database["public"]["Enums"]["content_type"]
          created_at: string
          created_by: string | null
          doi: string | null
          isbn: string | null
          key_concepts: Json | null
          keywords: string[] | null
          level: number
          primary_pillar: string
          publication_year: number | null
          published_at: string | null
          publisher: string | null
          secondary_pillar: string | null
          source_uri: string | null
          status: Database["public"]["Enums"]["content_status"]
          subtitle: string | null
          summary: string | null
          title: string
          topics: string[] | null
          transcript_text: string | null
          updated_at: string
          validated_by: string | null
          version: number
        }
        Insert: {
          abstract?: string | null
          author?: string
          content_id: string
          content_type: Database["public"]["Enums"]["content_type"]
          created_at?: string
          created_by?: string | null
          doi?: string | null
          isbn?: string | null
          key_concepts?: Json | null
          keywords?: string[] | null
          level: number
          primary_pillar: string
          publication_year?: number | null
          published_at?: string | null
          publisher?: string | null
          secondary_pillar?: string | null
          source_uri?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          subtitle?: string | null
          summary?: string | null
          title: string
          topics?: string[] | null
          transcript_text?: string | null
          updated_at?: string
          validated_by?: string | null
          version?: number
        }
        Update: {
          abstract?: string | null
          author?: string
          content_id?: string
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string
          created_by?: string | null
          doi?: string | null
          isbn?: string | null
          key_concepts?: Json | null
          keywords?: string[] | null
          level?: number
          primary_pillar?: string
          publication_year?: number | null
          published_at?: string | null
          publisher?: string | null
          secondary_pillar?: string | null
          source_uri?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          subtitle?: string | null
          summary?: string | null
          title?: string
          topics?: string[] | null
          transcript_text?: string | null
          updated_at?: string
          validated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      course_content_sources: {
        Row: {
          content_id: string
          course_id: string
          usage_type: string | null
        }
        Insert: {
          content_id: string
          course_id: string
          usage_type?: string | null
        }
        Update: {
          content_id?: string
          course_id?: string
          usage_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_content_sources_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "course_content_sources_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lms_courses"
            referencedColumns: ["course_id"]
          },
        ]
      }
      course_prerequisites: {
        Row: {
          course_id: string
          required_course_id: string
        }
        Insert: {
          course_id: string
          required_course_id: string
        }
        Update: {
          course_id?: string
          required_course_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_prerequisites_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lms_courses"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "course_prerequisites_required_course_id_fkey"
            columns: ["required_course_id"]
            isOneToOne: false
            referencedRelation: "lms_courses"
            referencedColumns: ["course_id"]
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
          creator_user_id: string | null
          ibge_code: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          org_id: string
          uf: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          created_at?: string
          creator_user_id?: string | null
          ibge_code?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          org_id: string
          uf?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          created_at?: string
          creator_user_id?: string | null
          ibge_code?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          org_id?: string
          uf?: string | null
          updated_at?: string
          visibility?: string
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
      edu_personalized_recommendations: {
        Row: {
          created_at: string
          entity_id: string
          id: string
          is_dismissed: boolean | null
          is_enrolled: boolean | null
          match_reasons: Json | null
          profile_id: string | null
          recommendation_type: string
          relevance_score: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          id?: string
          is_dismissed?: boolean | null
          is_enrolled?: boolean | null
          match_reasons?: Json | null
          profile_id?: string | null
          recommendation_type: string
          relevance_score?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          id?: string
          is_dismissed?: boolean | null
          is_enrolled?: boolean | null
          match_reasons?: Json | null
          profile_id?: string | null
          recommendation_type?: string
          relevance_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "edu_personalized_recommendations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "edu_student_profiles"
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
      edu_student_profiles: {
        Row: {
          available_hours_per_week: number | null
          completed_at: string | null
          created_at: string
          destination_id: string | null
          experience_level: string | null
          id: string
          interest_pillars: string[] | null
          interest_themes: string[] | null
          is_complete: boolean | null
          job_role: string | null
          learning_goals: string[] | null
          occupation_area: string | null
          preferred_format: string | null
          territory_context: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          available_hours_per_week?: number | null
          completed_at?: string | null
          created_at?: string
          destination_id?: string | null
          experience_level?: string | null
          id?: string
          interest_pillars?: string[] | null
          interest_themes?: string[] | null
          is_complete?: boolean | null
          job_role?: string | null
          learning_goals?: string[] | null
          occupation_area?: string | null
          preferred_format?: string | null
          territory_context?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          available_hours_per_week?: number | null
          completed_at?: string | null
          created_at?: string
          destination_id?: string | null
          experience_level?: string | null
          id?: string
          interest_pillars?: string[] | null
          interest_themes?: string[] | null
          is_complete?: boolean | null
          job_role?: string | null
          learning_goals?: string[] | null
          occupation_area?: string | null
          preferred_format?: string | null
          territory_context?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "edu_student_profiles_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edu_student_profiles_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "public_destination_summary"
            referencedColumns: ["destination_id"]
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
      edu_training_access: {
        Row: {
          access_type: string
          created_at: string
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          org_id: string | null
          training_id: string
          user_id: string | null
        }
        Insert: {
          access_type: string
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          org_id?: string | null
          training_id: string
          user_id?: string | null
        }
        Update: {
          access_type?: string
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          org_id?: string | null
          training_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "edu_training_access_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edu_training_access_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "edu_trainings"
            referencedColumns: ["training_id"]
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
      erp_diagnostics: {
        Row: {
          created_at: string
          diagnostic_id: string
          entity_ref: string
          entity_type: string | null
          igma_warnings: Json | null
          indicators_data: Json | null
          org_id: string | null
          pillar_priority: string | null
        }
        Insert: {
          created_at?: string
          diagnostic_id?: string
          entity_ref: string
          entity_type?: string | null
          igma_warnings?: Json | null
          indicators_data?: Json | null
          org_id?: string | null
          pillar_priority?: string | null
        }
        Update: {
          created_at?: string
          diagnostic_id?: string
          entity_ref?: string
          entity_type?: string | null
          igma_warnings?: Json | null
          indicators_data?: Json | null
          org_id?: string | null
          pillar_priority?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "erp_diagnostics_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_event_log: {
        Row: {
          created_at: string
          event_id: string
          event_type: string
          org_id: string | null
          payload: Json
        }
        Insert: {
          created_at?: string
          event_id?: string
          event_type: string
          org_id?: string | null
          payload: Json
        }
        Update: {
          created_at?: string
          event_id?: string
          event_type?: string
          org_id?: string | null
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "erp_event_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_answers: {
        Row: {
          answered_at: string | null
          attempt_id: string
          awarded_points: number | null
          free_text_answer: string | null
          is_correct: boolean | null
          quiz_id: string
          selected_option_id: string | null
        }
        Insert: {
          answered_at?: string | null
          attempt_id: string
          awarded_points?: number | null
          free_text_answer?: string | null
          is_correct?: boolean | null
          quiz_id: string
          selected_option_id?: string | null
        }
        Update: {
          answered_at?: string | null
          attempt_id?: string
          awarded_points?: number | null
          free_text_answer?: string | null
          is_correct?: boolean | null
          quiz_id?: string
          selected_option_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["attempt_id"]
          },
          {
            foreignKeyName: "exam_answers_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["quiz_id"]
          },
          {
            foreignKeyName: "exam_answers_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "quiz_options"
            referencedColumns: ["option_id"]
          },
        ]
      }
      exam_attempts: {
        Row: {
          attempt_id: string
          audit_trail_ref: string | null
          created_at: string
          exam_id: string | null
          grading_mode: Database["public"]["Enums"]["grading_mode_type"] | null
          ip_address: unknown
          result: Database["public"]["Enums"]["exam_result_type"] | null
          score_pct: number | null
          started_at: string
          submitted_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          attempt_id?: string
          audit_trail_ref?: string | null
          created_at?: string
          exam_id?: string | null
          grading_mode?: Database["public"]["Enums"]["grading_mode_type"] | null
          ip_address?: unknown
          result?: Database["public"]["Enums"]["exam_result_type"] | null
          score_pct?: number | null
          started_at?: string
          submitted_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          attempt_id?: string
          audit_trail_ref?: string | null
          created_at?: string
          exam_id?: string | null
          grading_mode?: Database["public"]["Enums"]["grading_mode_type"] | null
          ip_address?: unknown
          result?: Database["public"]["Enums"]["exam_result_type"] | null
          score_pct?: number | null
          started_at?: string
          submitted_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["exam_id"]
          },
        ]
      }
      exam_questions: {
        Row: {
          display_order: number
          exam_id: string
          options_shuffle_seed: number | null
          quiz_id: string
        }
        Insert: {
          display_order: number
          exam_id: string
          options_shuffle_seed?: number | null
          quiz_id: string
        }
        Update: {
          display_order?: number
          exam_id?: string
          options_shuffle_seed?: number | null
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["exam_id"]
          },
          {
            foreignKeyName: "exam_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["quiz_id"]
          },
        ]
      }
      exam_rulesets: {
        Row: {
          allow_retake: boolean | null
          course_id: string | null
          created_at: string
          max_attempts: number | null
          min_days_between_same_quiz: number | null
          min_score_pct: number
          pillar_mix: Json | null
          question_count: number
          retake_wait_hours: number | null
          ruleset_id: string
          time_limit_minutes: number
          updated_at: string
        }
        Insert: {
          allow_retake?: boolean | null
          course_id?: string | null
          created_at?: string
          max_attempts?: number | null
          min_days_between_same_quiz?: number | null
          min_score_pct: number
          pillar_mix?: Json | null
          question_count: number
          retake_wait_hours?: number | null
          ruleset_id?: string
          time_limit_minutes: number
          updated_at?: string
        }
        Update: {
          allow_retake?: boolean | null
          course_id?: string | null
          created_at?: string
          max_attempts?: number | null
          min_days_between_same_quiz?: number | null
          min_score_pct?: number
          pillar_mix?: Json | null
          question_count?: number
          retake_wait_hours?: number | null
          ruleset_id?: string
          time_limit_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_rulesets_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: true
            referencedRelation: "lms_courses"
            referencedColumns: ["course_id"]
          },
        ]
      }
      exams: {
        Row: {
          composition_hash: string
          course_id: string | null
          course_version: number
          created_at: string
          exam_id: string
          expires_at: string
          question_ids: string[]
          ruleset_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["exam_status_type"]
          submitted_at: string | null
          user_id: string | null
        }
        Insert: {
          composition_hash: string
          course_id?: string | null
          course_version?: number
          created_at?: string
          exam_id?: string
          expires_at: string
          question_ids: string[]
          ruleset_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["exam_status_type"]
          submitted_at?: string | null
          user_id?: string | null
        }
        Update: {
          composition_hash?: string
          course_id?: string | null
          course_version?: number
          created_at?: string
          exam_id?: string
          expires_at?: string
          question_ids?: string[]
          ruleset_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["exam_status_type"]
          submitted_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exams_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lms_courses"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "exams_ruleset_id_fkey"
            columns: ["ruleset_id"]
            isOneToOne: false
            referencedRelation: "exam_rulesets"
            referencedColumns: ["ruleset_id"]
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
      learning_prescriptions_lms: {
        Row: {
          created_at: string
          diagnostic_id: string | null
          prescription_id: string
          reasoning: string | null
          recommended_courses: Json | null
          recommended_track_id: string | null
          target_roles: Json | null
        }
        Insert: {
          created_at?: string
          diagnostic_id?: string | null
          prescription_id?: string
          reasoning?: string | null
          recommended_courses?: Json | null
          recommended_track_id?: string | null
          target_roles?: Json | null
        }
        Update: {
          created_at?: string
          diagnostic_id?: string | null
          prescription_id?: string
          reasoning?: string | null
          recommended_courses?: Json | null
          recommended_track_id?: string | null
          target_roles?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_prescriptions_lms_diagnostic_id_fkey"
            columns: ["diagnostic_id"]
            isOneToOne: false
            referencedRelation: "erp_diagnostics"
            referencedColumns: ["diagnostic_id"]
          },
          {
            foreignKeyName: "learning_prescriptions_lms_recommended_track_id_fkey"
            columns: ["recommended_track_id"]
            isOneToOne: false
            referencedRelation: "lms_tracks"
            referencedColumns: ["track_id"]
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
      lesson_content_sources: {
        Row: {
          citation_text: string | null
          content_id: string
          lesson_id: string
          source_locator: string
        }
        Insert: {
          citation_text?: string | null
          content_id: string
          lesson_id: string
          source_locator: string
        }
        Update: {
          citation_text?: string | null
          content_id?: string
          lesson_id?: string
          source_locator?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_content_sources_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "lesson_content_sources_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lms_lessons"
            referencedColumns: ["lesson_id"]
          },
        ]
      }
      lms_audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string
          entity_type: string
          ip_address: unknown
          log_id: string
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          org_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id: string
          entity_type: string
          ip_address?: unknown
          log_id?: string
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          org_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          ip_address?: unknown
          log_id?: string
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          org_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lms_audit_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_certificates: {
        Row: {
          attempt_id: string | null
          certificate_id: string
          course_id: string | null
          course_version: number
          created_at: string
          issued_at: string
          pdf_generated_at: string | null
          pdf_uri: string | null
          pillar_scope: string
          qr_verify_url: string | null
          revoked_at: string | null
          revoked_reason: string | null
          status: Database["public"]["Enums"]["certificate_status_type"] | null
          user_id: string | null
          verification_code: string
          workload_minutes: number
        }
        Insert: {
          attempt_id?: string | null
          certificate_id: string
          course_id?: string | null
          course_version: number
          created_at?: string
          issued_at?: string
          pdf_generated_at?: string | null
          pdf_uri?: string | null
          pillar_scope: string
          qr_verify_url?: string | null
          revoked_at?: string | null
          revoked_reason?: string | null
          status?: Database["public"]["Enums"]["certificate_status_type"] | null
          user_id?: string | null
          verification_code: string
          workload_minutes: number
        }
        Update: {
          attempt_id?: string | null
          certificate_id?: string
          course_id?: string | null
          course_version?: number
          created_at?: string
          issued_at?: string
          pdf_generated_at?: string | null
          pdf_uri?: string | null
          pillar_scope?: string
          qr_verify_url?: string | null
          revoked_at?: string | null
          revoked_reason?: string | null
          status?: Database["public"]["Enums"]["certificate_status_type"] | null
          user_id?: string | null
          verification_code?: string
          workload_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "lms_certificates_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["attempt_id"]
          },
          {
            foreignKeyName: "lms_certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lms_courses"
            referencedColumns: ["course_id"]
          },
        ]
      }
      lms_courses: {
        Row: {
          course_id: string
          created_at: string
          created_by: string | null
          description: string | null
          learning_objectives: string[] | null
          level: number
          org_id: string | null
          prerequisite_text: string | null
          primary_pillar: string
          published_at: string | null
          status: Database["public"]["Enums"]["course_status_type"]
          title: string
          updated_at: string
          version: number
          workload_minutes: number | null
        }
        Insert: {
          course_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          learning_objectives?: string[] | null
          level: number
          org_id?: string | null
          prerequisite_text?: string | null
          primary_pillar: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["course_status_type"]
          title: string
          updated_at?: string
          version?: number
          workload_minutes?: number | null
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          learning_objectives?: string[] | null
          level?: number
          org_id?: string | null
          prerequisite_text?: string | null
          primary_pillar?: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["course_status_type"]
          title?: string
          updated_at?: string
          version?: number
          workload_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lms_courses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_enrollments: {
        Row: {
          completed_at: string | null
          course_id: string | null
          course_version: number
          created_at: string
          enrollment_id: string
          last_accessed_at: string | null
          progress_pct: number | null
          started_at: string
          status: Database["public"]["Enums"]["enrollment_status_type"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          course_id?: string | null
          course_version?: number
          created_at?: string
          enrollment_id?: string
          last_accessed_at?: string | null
          progress_pct?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["enrollment_status_type"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          course_id?: string | null
          course_version?: number
          created_at?: string
          enrollment_id?: string
          last_accessed_at?: string | null
          progress_pct?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["enrollment_status_type"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lms_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lms_courses"
            referencedColumns: ["course_id"]
          },
        ]
      }
      lms_lesson_progress: {
        Row: {
          completed_at: string | null
          last_accessed_at: string | null
          lesson_id: string
          progress_pct: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["lesson_progress_status"]
          time_spent_minutes: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          last_accessed_at?: string | null
          lesson_id: string
          progress_pct?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["lesson_progress_status"]
          time_spent_minutes?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          last_accessed_at?: string | null
          lesson_id?: string
          progress_pct?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["lesson_progress_status"]
          time_spent_minutes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lms_lessons"
            referencedColumns: ["lesson_id"]
          },
        ]
      }
      lms_lessons: {
        Row: {
          content_text: string | null
          created_at: string
          description: string | null
          estimated_minutes: number | null
          lesson_id: string
          lesson_type: Database["public"]["Enums"]["lesson_type"]
          module_id: string | null
          order_index: number
          slides_url: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          content_text?: string | null
          created_at?: string
          description?: string | null
          estimated_minutes?: number | null
          lesson_id?: string
          lesson_type: Database["public"]["Enums"]["lesson_type"]
          module_id?: string | null
          order_index: number
          slides_url?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          content_text?: string | null
          created_at?: string
          description?: string | null
          estimated_minutes?: number | null
          lesson_id?: string
          lesson_type?: Database["public"]["Enums"]["lesson_type"]
          module_id?: string | null
          order_index?: number
          slides_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lms_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "lms_modules"
            referencedColumns: ["module_id"]
          },
        ]
      }
      lms_modules: {
        Row: {
          course_id: string | null
          created_at: string
          description: string | null
          module_id: string
          order_index: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          description?: string | null
          module_id?: string
          order_index: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          description?: string | null
          module_id?: string
          order_index?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lms_courses"
            referencedColumns: ["course_id"]
          },
        ]
      }
      lms_roles: {
        Row: {
          created_at: string
          default_max_level: number | null
          description: string | null
          name: Database["public"]["Enums"]["lms_role_name"]
          permissions: Json | null
          role_id: string
        }
        Insert: {
          created_at?: string
          default_max_level?: number | null
          description?: string | null
          name: Database["public"]["Enums"]["lms_role_name"]
          permissions?: Json | null
          role_id?: string
        }
        Update: {
          created_at?: string
          default_max_level?: number | null
          description?: string | null
          name?: Database["public"]["Enums"]["lms_role_name"]
          permissions?: Json | null
          role_id?: string
        }
        Relationships: []
      }
      lms_track_courses: {
        Row: {
          course_id: string
          is_optional: boolean | null
          order_index: number
          track_id: string
        }
        Insert: {
          course_id: string
          is_optional?: boolean | null
          order_index: number
          track_id: string
        }
        Update: {
          course_id?: string
          is_optional?: boolean | null
          order_index?: number
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_track_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lms_courses"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "lms_track_courses_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "lms_tracks"
            referencedColumns: ["track_id"]
          },
        ]
      }
      lms_tracks: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          level: number
          org_id: string | null
          pillar_scope: Database["public"]["Enums"]["pillar_scope_type"]
          status: Database["public"]["Enums"]["track_status_type"]
          title: string
          total_workload_minutes: number | null
          track_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          level: number
          org_id?: string | null
          pillar_scope: Database["public"]["Enums"]["pillar_scope_type"]
          status?: Database["public"]["Enums"]["track_status_type"]
          title: string
          total_workload_minutes?: number | null
          track_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          level?: number
          org_id?: string | null
          pillar_scope?: Database["public"]["Enums"]["pillar_scope_type"]
          status?: Database["public"]["Enums"]["track_status_type"]
          title?: string
          total_workload_minutes?: number | null
          track_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_tracks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_user_profiles: {
        Row: {
          created_at: string
          id: string
          lms_role_id: string | null
          max_level: number
          org_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lms_role_id?: string | null
          max_level?: number
          org_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lms_role_id?: string | null
          max_level?: number
          org_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_user_profiles_lms_role_id_fkey"
            columns: ["lms_role_id"]
            isOneToOne: false
            referencedRelation: "lms_roles"
            referencedColumns: ["role_id"]
          },
          {
            foreignKeyName: "lms_user_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      ondemand_output_sources: {
        Row: {
          content_id: string
          output_id: string
          source_locator: string
          usage_context: string | null
        }
        Insert: {
          content_id: string
          output_id: string
          source_locator: string
          usage_context?: string | null
        }
        Update: {
          content_id?: string
          output_id?: string
          source_locator?: string
          usage_context?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ondemand_output_sources_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "ondemand_output_sources_output_id_fkey"
            columns: ["output_id"]
            isOneToOne: false
            referencedRelation: "ondemand_outputs"
            referencedColumns: ["output_id"]
          },
        ]
      }
      ondemand_outputs: {
        Row: {
          created_at: string
          description: string | null
          file_uri: string | null
          output_id: string
          output_type: Database["public"]["Enums"]["ondemand_output_type"]
          payload: Json
          request_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_uri?: string | null
          output_id?: string
          output_type: Database["public"]["Enums"]["ondemand_output_type"]
          payload: Json
          request_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_uri?: string | null
          output_id?: string
          output_type?: Database["public"]["Enums"]["ondemand_output_type"]
          payload?: Json
          request_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ondemand_outputs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "ondemand_requests"
            referencedColumns: ["request_id"]
          },
        ]
      }
      ondemand_requests: {
        Row: {
          additional_context: string | null
          context_type:
            | Database["public"]["Enums"]["ondemand_context_type"]
            | null
          created_at: string
          desired_level: number | null
          desired_pillar: string | null
          error_message: string | null
          goal_type: Database["public"]["Enums"]["ondemand_goal_type"]
          learning_goals: string[] | null
          org_id: string | null
          processing_time_seconds: number | null
          request_id: string
          specific_topics: string[] | null
          status: Database["public"]["Enums"]["ondemand_status_type"] | null
          topic_text: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          additional_context?: string | null
          context_type?:
            | Database["public"]["Enums"]["ondemand_context_type"]
            | null
          created_at?: string
          desired_level?: number | null
          desired_pillar?: string | null
          error_message?: string | null
          goal_type: Database["public"]["Enums"]["ondemand_goal_type"]
          learning_goals?: string[] | null
          org_id?: string | null
          processing_time_seconds?: number | null
          request_id?: string
          specific_topics?: string[] | null
          status?: Database["public"]["Enums"]["ondemand_status_type"] | null
          topic_text: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          additional_context?: string | null
          context_type?:
            | Database["public"]["Enums"]["ondemand_context_type"]
            | null
          created_at?: string
          desired_level?: number | null
          desired_pillar?: string | null
          error_message?: string | null
          goal_type?: Database["public"]["Enums"]["ondemand_goal_type"]
          learning_goals?: string[] | null
          org_id?: string | null
          processing_time_seconds?: number | null
          request_id?: string
          specific_topics?: string[] | null
          status?: Database["public"]["Enums"]["ondemand_status_type"] | null
          topic_text?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ondemand_requests_org_id_fkey"
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
      questionnaire_questions: {
        Row: {
          created_at: string
          mapping_logic: Json | null
          options: Json | null
          question_id: string
          question_text: string
          question_type: string
          questionnaire_id: string
          required: boolean | null
          sort_order: number | null
          step_number: number
        }
        Insert: {
          created_at?: string
          mapping_logic?: Json | null
          options?: Json | null
          question_id?: string
          question_text: string
          question_type: string
          questionnaire_id: string
          required?: boolean | null
          sort_order?: number | null
          step_number: number
        }
        Update: {
          created_at?: string
          mapping_logic?: Json | null
          options?: Json | null
          question_id?: string
          question_text?: string
          question_type?: string
          questionnaire_id?: string
          required?: boolean | null
          sort_order?: number | null
          step_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_questions_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "questionnaires"
            referencedColumns: ["questionnaire_id"]
          },
        ]
      }
      questionnaire_responses: {
        Row: {
          answers: Json
          computed_recommendations: Json | null
          created_at: string
          questionnaire_id: string
          recommended_course_ids: string[] | null
          recommended_track_ids: string[] | null
          response_id: string
          submitted_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          computed_recommendations?: Json | null
          created_at?: string
          questionnaire_id: string
          recommended_course_ids?: string[] | null
          recommended_track_ids?: string[] | null
          response_id?: string
          submitted_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          computed_recommendations?: Json | null
          created_at?: string
          questionnaire_id?: string
          recommended_course_ids?: string[] | null
          recommended_track_ids?: string[] | null
          response_id?: string
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_responses_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "questionnaires"
            referencedColumns: ["questionnaire_id"]
          },
        ]
      }
      questionnaires: {
        Row: {
          active: boolean | null
          created_at: string
          created_by: string | null
          description: string | null
          org_id: string | null
          questionnaire_id: string
          questionnaire_type: string | null
          title: string
          updated_at: string
          version: number | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          org_id?: string | null
          questionnaire_id?: string
          questionnaire_type?: string | null
          title: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          active?: boolean | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          org_id?: string | null
          questionnaire_id?: string
          questionnaire_type?: string | null
          title?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "questionnaires_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_content_sources: {
        Row: {
          content_id: string
          quiz_id: string
          source_locator: string
        }
        Insert: {
          content_id: string
          quiz_id: string
          source_locator: string
        }
        Update: {
          content_id?: string
          quiz_id?: string
          source_locator?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_content_sources_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "quiz_content_sources_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["quiz_id"]
          },
        ]
      }
      quiz_options: {
        Row: {
          created_at: string
          is_correct: boolean
          option_id: string
          option_label: string
          option_text: string
          quiz_id: string | null
        }
        Insert: {
          created_at?: string
          is_correct?: boolean
          option_id?: string
          option_label: string
          option_text: string
          quiz_id?: string | null
        }
        Update: {
          created_at?: string
          is_correct?: boolean
          option_id?: string
          option_label?: string
          option_text?: string
          quiz_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_options_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["quiz_id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          created_at: string
          created_by: string | null
          difficulty: number | null
          discrimination_index: number | null
          explanation: string | null
          is_active: boolean | null
          level: number
          origin: Database["public"]["Enums"]["quiz_origin_type"]
          pillar: string
          question_type: Database["public"]["Enums"]["question_type"]
          quiz_id: string
          stem: string
          theme: string | null
          updated_at: string
          validated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          difficulty?: number | null
          discrimination_index?: number | null
          explanation?: string | null
          is_active?: boolean | null
          level: number
          origin?: Database["public"]["Enums"]["quiz_origin_type"]
          pillar: string
          question_type?: Database["public"]["Enums"]["question_type"]
          quiz_id?: string
          stem: string
          theme?: string | null
          updated_at?: string
          validated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          difficulty?: number | null
          discrimination_index?: number | null
          explanation?: string | null
          is_active?: boolean | null
          level?: number
          origin?: Database["public"]["Enums"]["quiz_origin_type"]
          pillar?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          quiz_id?: string
          stem?: string
          theme?: string | null
          updated_at?: string
          validated_by?: string | null
        }
        Relationships: []
      }
      quiz_usage_history: {
        Row: {
          last_used_at: string
          quiz_id: string
          times_used: number
          user_id: string
        }
        Insert: {
          last_used_at: string
          quiz_id: string
          times_used?: number
          user_id: string
        }
        Update: {
          last_used_at?: string
          quiz_id?: string
          times_used?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_usage_history_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["quiz_id"]
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
      track_instance_items: {
        Row: {
          item_id: string
          item_type: string
          order_index: number
          track_instance_id: string
        }
        Insert: {
          item_id: string
          item_type: string
          order_index: number
          track_instance_id: string
        }
        Update: {
          item_id?: string
          item_type?: string
          order_index?: number
          track_instance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_instance_items_track_instance_id_fkey"
            columns: ["track_instance_id"]
            isOneToOne: false
            referencedRelation: "track_instances"
            referencedColumns: ["track_instance_id"]
          },
        ]
      }
      track_instances: {
        Row: {
          created_at: string
          description: string | null
          level: number
          pillar_scope: string
          request_id: string | null
          title: string
          track_instance_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          level: number
          pillar_scope: string
          request_id?: string | null
          title: string
          track_instance_id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          level?: number
          pillar_scope?: string
          request_id?: string | null
          title?: string
          track_instance_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "track_instances_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "ondemand_requests"
            referencedColumns: ["request_id"]
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
      complete_user_onboarding: {
        Args: { _role: string; _system_access: string; _user_id: string }
        Returns: boolean
      }
      create_lms_audit_log: {
        Args: {
          p_action: string
          p_entity_id: string
          p_entity_type: string
          p_metadata?: Json
          p_new_values?: Json
          p_old_values?: Json
        }
        Returns: string
      }
      generate_certificate_id: { Args: never; Returns: string }
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
      user_has_training_access: {
        Args: { p_training_id: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "ADMIN" | "ANALYST" | "VIEWER" | "ESTUDANTE" | "PROFESSOR"
      assessment_status: "DRAFT" | "DATA_READY" | "CALCULATED"
      certificate_status_type: "active" | "revoked" | "expired"
      collection_type: "AUTOMATICA" | "MANUAL" | "ESTIMADA"
      content_status: "draft" | "validated" | "published" | "archived"
      content_type:
        | "BOOK"
        | "BOOK_CHAPTER"
        | "ARTICLE"
        | "LIVE"
        | "LECTURE"
        | "SPEECH"
        | "VIDEO"
        | "INTERVIEW"
        | "THESIS"
      course_level: "BASICO" | "INTERMEDIARIO" | "AVANCADO"
      course_status_type: "draft" | "published" | "archived"
      data_source: "IBGE" | "CADASTUR" | "PESQUISA_LOCAL" | "MANUAL" | "OUTRO"
      enrollment_status_type: "active" | "completed" | "dropped" | "suspended"
      exam_result_type: "passed" | "failed" | "pending"
      exam_status_type:
        | "generated"
        | "started"
        | "submitted"
        | "expired"
        | "voided"
      external_collection_method: "AUTOMATIC" | "BATCH" | "MANUAL"
      grading_mode_type: "automatic" | "hybrid" | "manual"
      indicator_direction: "HIGH_IS_BETTER" | "LOW_IS_BETTER"
      lesson_progress_status: "not_started" | "in_progress" | "completed"
      lesson_type: "video" | "text" | "interactive" | "quiz"
      live_type: "primary" | "case" | "complementary"
      lms_role_name:
        | "STUDENT"
        | "TEACHER"
        | "RESEARCHER"
        | "PUBLIC_MANAGER"
        | "ENTREPRENEUR"
        | "CONSULTANT"
        | "INSTITUTIONAL_ADMIN"
        | "PLATFORM_ADMIN"
      normalization_type: "MIN_MAX" | "BANDS" | "BINARY"
      ondemand_context_type: "academic" | "institutional" | "professional"
      ondemand_goal_type:
        | "course"
        | "track"
        | "lesson_plan"
        | "tcc_outline"
        | "thesis_outline"
        | "training_plan"
      ondemand_output_type:
        | "track_instance"
        | "course_instance"
        | "lesson_plan"
        | "tcc_outline"
        | "thesis_outline"
        | "training_plan"
      ondemand_status_type:
        | "received"
        | "validated"
        | "generating"
        | "generated"
        | "rejected"
        | "failed"
      pillar_scope_type: "RA" | "OE" | "AO" | "INTEGRATED"
      pillar_type: "RA" | "OE" | "AO"
      question_type: "multiple_choice" | "true_false" | "short_answer"
      quiz_origin_type: "existing" | "generated" | "imported"
      recommendation_entity_type: "course" | "live" | "track"
      severity_type: "CRITICO" | "MODERADO" | "BOM"
      system_access_type: "ERP" | "EDU"
      target_agent: "GESTORES" | "TECNICOS" | "TRADE"
      territorial_interpretation: "ESTRUTURAL" | "GESTAO" | "ENTREGA"
      track_status_type: "draft" | "published" | "archived"
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
      certificate_status_type: ["active", "revoked", "expired"],
      collection_type: ["AUTOMATICA", "MANUAL", "ESTIMADA"],
      content_status: ["draft", "validated", "published", "archived"],
      content_type: [
        "BOOK",
        "BOOK_CHAPTER",
        "ARTICLE",
        "LIVE",
        "LECTURE",
        "SPEECH",
        "VIDEO",
        "INTERVIEW",
        "THESIS",
      ],
      course_level: ["BASICO", "INTERMEDIARIO", "AVANCADO"],
      course_status_type: ["draft", "published", "archived"],
      data_source: ["IBGE", "CADASTUR", "PESQUISA_LOCAL", "MANUAL", "OUTRO"],
      enrollment_status_type: ["active", "completed", "dropped", "suspended"],
      exam_result_type: ["passed", "failed", "pending"],
      exam_status_type: [
        "generated",
        "started",
        "submitted",
        "expired",
        "voided",
      ],
      external_collection_method: ["AUTOMATIC", "BATCH", "MANUAL"],
      grading_mode_type: ["automatic", "hybrid", "manual"],
      indicator_direction: ["HIGH_IS_BETTER", "LOW_IS_BETTER"],
      lesson_progress_status: ["not_started", "in_progress", "completed"],
      lesson_type: ["video", "text", "interactive", "quiz"],
      live_type: ["primary", "case", "complementary"],
      lms_role_name: [
        "STUDENT",
        "TEACHER",
        "RESEARCHER",
        "PUBLIC_MANAGER",
        "ENTREPRENEUR",
        "CONSULTANT",
        "INSTITUTIONAL_ADMIN",
        "PLATFORM_ADMIN",
      ],
      normalization_type: ["MIN_MAX", "BANDS", "BINARY"],
      ondemand_context_type: ["academic", "institutional", "professional"],
      ondemand_goal_type: [
        "course",
        "track",
        "lesson_plan",
        "tcc_outline",
        "thesis_outline",
        "training_plan",
      ],
      ondemand_output_type: [
        "track_instance",
        "course_instance",
        "lesson_plan",
        "tcc_outline",
        "thesis_outline",
        "training_plan",
      ],
      ondemand_status_type: [
        "received",
        "validated",
        "generating",
        "generated",
        "rejected",
        "failed",
      ],
      pillar_scope_type: ["RA", "OE", "AO", "INTEGRATED"],
      pillar_type: ["RA", "OE", "AO"],
      question_type: ["multiple_choice", "true_false", "short_answer"],
      quiz_origin_type: ["existing", "generated", "imported"],
      recommendation_entity_type: ["course", "live", "track"],
      severity_type: ["CRITICO", "MODERADO", "BOM"],
      system_access_type: ["ERP", "EDU"],
      target_agent: ["GESTORES", "TECNICOS", "TRADE"],
      territorial_interpretation: ["ESTRUTURAL", "GESTAO", "ENTREGA"],
      track_status_type: ["draft", "published", "archived"],
    },
  },
} as const
