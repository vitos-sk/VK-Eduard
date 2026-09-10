/**
 * Сгенерировано из схемы Supabase — руками не править.
 * Обновление после каждой миграции:
 *   npx supabase gen types typescript --project-id lhtcocvnqmfdxtukuels > src/lib/supabase/types.gen.ts
 */
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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      companies: {
        Row: {
          created_at: string
          daily_norm_minutes: number
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          daily_norm_minutes?: number
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          daily_norm_minutes?: number
          id?: string
          name?: string
        }
        Relationships: []
      }
      entry_photos: {
        Row: {
          entry_id: string
          height: number | null
          id: string
          size_bytes: number | null
          sort_order: number
          storage_path: string
          width: number | null
        }
        Insert: {
          entry_id: string
          height?: number | null
          id?: string
          size_bytes?: number | null
          sort_order?: number
          storage_path: string
          width?: number | null
        }
        Update: {
          entry_id?: string
          height?: number | null
          id?: string
          size_bytes?: number | null
          sort_order?: number
          storage_path?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "entry_photos_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entry_hours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_photos_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "work_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_hue: number
          company_id: string
          created_at: string
          daily_norm_minutes: number
          full_name: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          avatar_hue?: number
          company_id: string
          created_at?: string
          daily_norm_minutes?: number
          full_name: string
          id: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          avatar_hue?: number
          company_id?: string
          created_at?: string
          daily_norm_minutes?: number
          full_name?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          address: string | null
          archived_at: string | null
          company_id: string
          created_at: string
          id: string
          kind: string | null
          name: string
          photo_path: string | null
          status: Database["public"]["Enums"]["site_status"]
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          company_id: string
          created_at?: string
          id?: string
          kind?: string | null
          name: string
          photo_path?: string | null
          status?: Database["public"]["Enums"]["site_status"]
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          company_id?: string
          created_at?: string
          id?: string
          kind?: string | null
          name?: string
          photo_path?: string | null
          status?: Database["public"]["Enums"]["site_status"]
        }
        Relationships: [
          {
            foreignKeyName: "sites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      work_entries: {
        Row: {
          author_id: string
          break_end: string | null
          break_minutes: number | null
          break_start: string | null
          client_id: string
          company_id: string
          created_at: string
          description: string
          ended_at: string | null
          id: string
          site_id: string | null
          source: Database["public"]["Enums"]["entry_source"]
          started_at: string
          total_minutes: number | null
          updated_at: string
          work_date: string
        }
        Insert: {
          author_id: string
          break_end?: string | null
          break_minutes?: number | null
          break_start?: string | null
          client_id: string
          company_id: string
          created_at?: string
          description?: string
          ended_at?: string | null
          id?: string
          site_id?: string | null
          source?: Database["public"]["Enums"]["entry_source"]
          started_at: string
          total_minutes?: number | null
          updated_at?: string
          work_date: string
        }
        Update: {
          author_id?: string
          break_end?: string | null
          break_minutes?: number | null
          break_start?: string | null
          client_id?: string
          company_id?: string
          created_at?: string
          description?: string
          ended_at?: string | null
          id?: string
          site_id?: string | null
          source?: Database["public"]["Enums"]["entry_source"]
          started_at?: string
          total_minutes?: number | null
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_entries_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_entries_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      entry_hours: {
        Row: {
          author_id: string | null
          break_end: string | null
          break_minutes: number | null
          break_start: string | null
          client_id: string | null
          company_id: string | null
          created_at: string | null
          daily_norm_minutes: number | null
          description: string | null
          ended_at: string | null
          full_name: string | null
          has_description: boolean | null
          id: string | null
          overtime_minutes: number | null
          photo_count: number | null
          site_id: string | null
          source: Database["public"]["Enums"]["entry_source"] | null
          started_at: string | null
          total_minutes: number | null
          updated_at: string | null
          work_date: string | null
          worked_minutes: number | null
        }
        Relationships: [
          {
            foreignKeyName: "work_entries_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_entries_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      entry_source: "timer" | "manual"
      site_status: "not_started" | "in_progress" | "completed" | "paused"
      user_role: "worker" | "boss"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      entry_source: ["timer", "manual"],
      site_status: ["not_started", "in_progress", "completed", "paused"],
      user_role: ["worker", "boss"],
    },
  },
} as const
