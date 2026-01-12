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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      conferences: {
        Row: {
          created_at: string | null
          created_by: string | null
          description_en: string | null
          description_he: string | null
          event_date: string
          expertise_areas: string[] | null
          id: string
          is_active: boolean | null
          location_en: string | null
          location_he: string | null
          name_en: string
          name_he: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description_en?: string | null
          description_he?: string | null
          event_date: string
          expertise_areas?: string[] | null
          id?: string
          is_active?: boolean | null
          location_en?: string | null
          location_he?: string | null
          name_en: string
          name_he: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description_en?: string | null
          description_he?: string | null
          event_date?: string
          expertise_areas?: string[] | null
          id?: string
          is_active?: boolean | null
          location_en?: string | null
          location_he?: string | null
          name_en?: string
          name_he?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string | null
          description_en: string | null
          description_he: string | null
          id: string
          name_en: string
          name_he: string
        }
        Insert: {
          created_at?: string | null
          description_en?: string | null
          description_he?: string | null
          id?: string
          name_en: string
          name_he: string
        }
        Update: {
          created_at?: string | null
          description_en?: string | null
          description_he?: string | null
          id?: string
          name_en?: string
          name_he?: string
        }
        Relationships: []
      }
      evaluation_criteria: {
        Row: {
          conference_id: string
          created_at: string | null
          description_en: string | null
          description_he: string | null
          id: string
          max_score: number | null
          name_en: string
          name_he: string
          sort_order: number | null
          weight: number | null
        }
        Insert: {
          conference_id: string
          created_at?: string | null
          description_en?: string | null
          description_he?: string | null
          id?: string
          max_score?: number | null
          name_en: string
          name_he: string
          sort_order?: number | null
          weight?: number | null
        }
        Update: {
          conference_id?: string
          created_at?: string | null
          description_en?: string | null
          description_he?: string | null
          id?: string
          max_score?: number | null
          name_en?: string
          name_he?: string
          sort_order?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_criteria_conference_id_fkey"
            columns: ["conference_id"]
            isOneToOne: false
            referencedRelation: "conferences"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_scores: {
        Row: {
          created_at: string | null
          criterion_id: string
          evaluation_id: string
          id: string
          notes: string | null
          score: number
        }
        Insert: {
          created_at?: string | null
          criterion_id: string
          evaluation_id: string
          id?: string
          notes?: string | null
          score: number
        }
        Update: {
          created_at?: string | null
          criterion_id?: string
          evaluation_id?: string
          id?: string
          notes?: string | null
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_scores_criterion_id_fkey"
            columns: ["criterion_id"]
            isOneToOne: false
            referencedRelation: "evaluation_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_scores_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          created_at: string | null
          general_notes: string | null
          id: string
          is_complete: boolean | null
          judge_id: string
          project_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          general_notes?: string | null
          id?: string
          is_complete?: boolean | null
          judge_id: string
          project_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          general_notes?: string | null
          id?: string
          is_complete?: boolean | null
          judge_id?: string
          project_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          conference_id: string
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string | null
          is_used: boolean | null
          role: Database["public"]["Enums"]["app_role"] | null
          token: string | null
        }
        Insert: {
          conference_id: string
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          is_used?: boolean | null
          role?: Database["public"]["Enums"]["app_role"] | null
          token?: string | null
        }
        Update: {
          conference_id?: string
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          is_used?: boolean | null
          role?: Database["public"]["Enums"]["app_role"] | null
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_conference_id_fkey"
            columns: ["conference_id"]
            isOneToOne: false
            referencedRelation: "conferences"
            referencedColumns: ["id"]
          },
        ]
      }
      judge_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string | null
          id: string
          judge_id: string
          project_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          judge_id: string
          project_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          judge_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "judge_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string | null
          email: string
          expertise_areas: string[] | null
          full_name: string
          id: string
          is_approved: boolean | null
          job_title: string | null
          phone: string | null
          preferred_language: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email: string
          expertise_areas?: string[] | null
          full_name: string
          id?: string
          is_approved?: boolean | null
          job_title?: string | null
          phone?: string | null
          preferred_language?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string
          expertise_areas?: string[] | null
          full_name?: string
          id?: string
          is_approved?: boolean | null
          job_title?: string | null
          phone?: string | null
          preferred_language?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          conference_id: string
          created_at: string | null
          department_id: string | null
          description_en: string | null
          description_he: string | null
          expertise_tags: string[] | null
          id: string
          presentation_time: string | null
          presentation_url: string | null
          room: string | null
          team_members: string[] | null
          title_en: string
          title_he: string
          updated_at: string | null
        }
        Insert: {
          conference_id: string
          created_at?: string | null
          department_id?: string | null
          description_en?: string | null
          description_he?: string | null
          expertise_tags?: string[] | null
          id?: string
          presentation_time?: string | null
          presentation_url?: string | null
          room?: string | null
          team_members?: string[] | null
          title_en: string
          title_he: string
          updated_at?: string | null
        }
        Update: {
          conference_id?: string
          created_at?: string | null
          department_id?: string | null
          description_en?: string | null
          description_he?: string | null
          expertise_tags?: string[] | null
          id?: string
          presentation_time?: string | null
          presentation_url?: string | null
          room?: string | null
          team_members?: string[] | null
          title_en?: string
          title_he?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_conference_id_fkey"
            columns: ["conference_id"]
            isOneToOne: false
            referencedRelation: "conferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
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
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      student_can_view_judge_profile: {
        Args: { _judge_user_id: string; _student_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "judge" | "department_manager" | "student"
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
      app_role: ["judge", "department_manager", "student"],
    },
  },
} as const
