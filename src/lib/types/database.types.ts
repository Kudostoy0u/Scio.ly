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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      bookmarks: {
        Row: {
          created_at: string | null
          event_name: string
          id: string
          question_data: Json
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_name: string
          id?: string
          question_data: Json
          source: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_name?: string
          id?: string
          question_data?: Json
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      game_points: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          points: number
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          points: number
          source: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          points?: number
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_points_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_members: {
        Row: {
          accuracy_percentage: number | null
          correct_answers: number
          id: string
          joined_at: string
          last_activity_at: string | null
          leaderboard_id: string
          questions_attempted: number
          user_id: string
        }
        Insert: {
          accuracy_percentage?: number | null
          correct_answers?: number
          id?: string
          joined_at?: string
          last_activity_at?: string | null
          leaderboard_id: string
          questions_attempted?: number
          user_id: string
        }
        Update: {
          accuracy_percentage?: number | null
          correct_answers?: number
          id?: string
          joined_at?: string
          last_activity_at?: string | null
          leaderboard_id?: string
          questions_attempted?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_members_leaderboard_id_fkey"
            columns: ["leaderboard_id"]
            isOneToOne: false
            referencedRelation: "leaderboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaderboard_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_snapshots: {
        Row: {
          accuracy_percentage: number
          correct_answers: number
          id: string
          leaderboard_id: string
          questions_attempted: number
          reset_period_end: string
          reset_period_start: string
          snapshot_date: string
          user_id: string
        }
        Insert: {
          accuracy_percentage: number
          correct_answers: number
          id?: string
          leaderboard_id: string
          questions_attempted: number
          reset_period_end: string
          reset_period_start: string
          snapshot_date?: string
          user_id: string
        }
        Update: {
          accuracy_percentage?: number
          correct_answers?: number
          id?: string
          leaderboard_id?: string
          questions_attempted?: number
          reset_period_end?: string
          reset_period_start?: string
          snapshot_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_snapshots_leaderboard_id_fkey"
            columns: ["leaderboard_id"]
            isOneToOne: false
            referencedRelation: "leaderboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaderboard_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboards: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_public: boolean
          join_code: string | null
          last_reset_at: string
          name: string
          next_reset_at: string | null
          reset_frequency: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          join_code?: string | null
          last_reset_at?: string
          name: string
          next_reset_at?: string | null
          reset_frequency?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          join_code?: string | null
          last_reset_at?: string
          name?: string
          next_reset_at?: string | null
          reset_frequency?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          message: string
          notification_type: string
          read_at: string | null
          team_id: string | null
          team_name: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message: string
          notification_type: string
          read_at?: string | null
          team_id?: string | null
          team_name?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string
          notification_type?: string
          read_at?: string | null
          team_id?: string | null
          team_name?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          correct_answers: number | null
          created_at: string | null
          date: string
          event_questions: Json | null
          events_practiced: string[] | null
          game_points: number | null
          id: string
          questions_attempted: number | null
          user_id: string
        }
        Insert: {
          correct_answers?: number | null
          created_at?: string | null
          date: string
          event_questions?: Json | null
          events_practiced?: string[] | null
          game_points?: number | null
          id?: string
          questions_attempted?: number | null
          user_id: string
        }
        Update: {
          correct_answers?: number | null
          created_at?: string | null
          date?: string
          event_questions?: Json | null
          events_practiced?: string[] | null
          game_points?: number | null
          id?: string
          questions_attempted?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string
          first_name: string | null
          has_generated_api_key: boolean | null
          id: string
          last_name: string | null
          name: string | null
          phone_number: string | null
          phone_verified: boolean | null
          phone_verified_at: string | null
          photo_url: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email: string
          first_name?: string | null
          has_generated_api_key?: boolean | null
          id: string
          last_name?: string | null
          name?: string | null
          phone_number?: string | null
          phone_verified?: boolean | null
          phone_verified_at?: string | null
          photo_url?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email?: string
          first_name?: string | null
          has_generated_api_key?: boolean | null
          id?: string
          last_name?: string | null
          name?: string | null
          phone_number?: string | null
          phone_verified?: boolean | null
          phone_verified_at?: string | null
          photo_url?: string | null
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_next_reset: {
        Args:
          | { frequency: string; from_date: string }
          | { frequency: string; start_date: string }
        Returns: string
      }
      create_private_leaderboard: {
        Args: {
          p_description: string
          p_name: string
          p_reset_frequency: string
        }
        Returns: {
          id: string
          join_code: string
        }[]
      }
      generate_join_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_stats_summary: {
        Args: { period_type?: string; target_user_id: string }
        Returns: {
          accuracy: number
          total_correct: number
          total_events: number
          total_points: number
          total_questions: number
        }[]
      }
      join_leaderboard_by_code: {
        Args: { p_join_code: string }
        Returns: string
      }
      join_public_leaderboard: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      leave_leaderboard: {
        Args: { p_leaderboard_id: string }
        Returns: undefined
      }
      reset_leaderboard: {
        Args: { p_leaderboard_id: string }
        Returns: undefined
      }
      update_leaderboard_stats: {
        Args: {
          p_correct_answers: number
          p_questions_attempted: number
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
