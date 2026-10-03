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
          server_state: Json
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
          server_state?: Json
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
          server_state?: Json
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
      challenge_for_day: {
        Args: { on_day: string }
        Returns: {
          content: Json
          number: number
          type: string
        }[]
      }
      challenge_public_content: {
        Args: { c: Database["public"]["Tables"]["challenges"]["Row"] }
        Returns: Json
      }
      challenge_solution: {
        Args: { c: Database["public"]["Tables"]["challenges"]["Row"] }
        Returns: Json
      }
      challenge_today: { Args: never; Returns: string }
      crossword_cells: {
        Args: { c: Database["public"]["Tables"]["challenges"]["Row"] }
        Returns: {
          cell: number
          letter: string
        }[]
      }
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
      normalize_answer: { Args: { input: string }; Returns: string }
      play_move: { Args: { move: Json; on_day: string }; Returns: Json }
      play_snapshot: {
        Args: {
          feedback: Json
          p: Database["public"]["Tables"]["plays"]["Row"]
        }
        Returns: Json
      }
      server_now: { Args: never; Returns: string }
      take_hint: { Args: { context?: Json; on_day: string }; Returns: Json }
      word_marks: { Args: { answer: string; guess: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
