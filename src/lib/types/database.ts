export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          username: string
          first_name: string | null
          last_name: string | null
          display_name: string | null
          photo_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          username: string
          first_name?: string | null
          last_name?: string | null
          display_name?: string | null
          photo_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          username?: string
          first_name?: string | null
          last_name?: string | null
          display_name?: string | null
          photo_url?: string | null
          created_at?: string
        }
      }
      user_stats: {
        Row: {
          id: string
          user_id: string
          date: string
          questions_attempted: number
          correct_answers: number
          events_practiced: string[]
          event_questions: Record<string, number>
          game_points: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          questions_attempted?: number
          correct_answers?: number
          events_practiced?: string[]
          event_questions?: Record<string, number>
          game_points?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          questions_attempted?: number
          correct_answers?: number
          events_practiced?: string[]
          event_questions?: Record<string, number>
          game_points?: number
          created_at?: string
        }
      }
      bookmarks: {
        Row: {
          id: string
          user_id: string
          question_data: Record<string, unknown>
          event_name: string
          source: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          question_data: Record<string, unknown>
          event_name: string
          source: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          question_data?: Record<string, unknown>
          event_name?: string
          source?: string
          created_at?: string
        }
      }
      game_points: {
        Row: {
          id: string
          user_id: string
          points: number
          source: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          points: number
          source: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          points?: number
          source?: string
          description?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}