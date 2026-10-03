// Generated from the database schema (Supabase type generator). Regenerate after migrations.

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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      challenges: {
        Row: {
          content: Json
          day: string
          number: number
          type: string
        }
        Insert: {
          content: Json
          day: string
          number: number
          type: string
        }
        Update: {
          content?: Json
          day?: string
          number?: number
          type?: string
        }
        Relationships: []
      }
      plays: {
        Row: {
          challenge_day: string
          finished_at: string | null
          game_state: Json | null
          hint_used: boolean
          started_at: string
          status: string | null
          time_ms: number | null
          user_id: string
        }
        Insert: {
          challenge_day: string
          finished_at?: string | null
          game_state?: Json | null
          hint_used?: boolean
          started_at?: string
          status?: string | null
          time_ms?: number | null
          user_id?: string
        }
        Update: {
          challenge_day?: string
          finished_at?: string | null
          game_state?: Json | null
          hint_used?: boolean
          started_at?: string
          status?: string | null
          time_ms?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plays_challenge_day_fkey"
            columns: ["challenge_day"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["day"]
          },
          {
            foreignKeyName: "plays_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      display_name_available: { Args: { name: string }; Returns: boolean }
      leaderboard: {
        Args: { max_rows?: number; on_day: string; period: string }
        Returns: {
          display_name: string
          is_you: boolean
          rank: number
          solved: number
          streak: number
          user_id: string
          value: number
        }[]
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
