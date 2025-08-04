export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          photo_url: string | null
          created_at: string
          navbar_style: 'default' | 'golden' | 'rainbow'
          has_unlocked_golden: boolean
          has_unlocked_rainbow: boolean
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          photo_url?: string | null
          created_at?: string
          navbar_style?: 'default' | 'golden' | 'rainbow'
          has_unlocked_golden?: boolean
          has_unlocked_rainbow?: boolean
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          photo_url?: string | null
          created_at?: string
          navbar_style?: 'default' | 'golden' | 'rainbow'
          has_unlocked_golden?: boolean
          has_unlocked_rainbow?: boolean
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