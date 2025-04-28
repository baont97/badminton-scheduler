export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      badminton_days: {
        Row: {
          can_pay: boolean
          created_at: string
          created_by: string | null
          date: string
          day_of_week: number
          id: string
          is_active: boolean
          max_members: number
          session_cost: number
          session_time: string
        }
        Insert: {
          can_pay?: boolean
          created_at?: string
          created_by?: string | null
          date: string
          day_of_week: number
          id?: string
          is_active?: boolean
          max_members?: number
          session_cost?: number
          session_time?: string
        }
        Update: {
          can_pay?: boolean
          created_at?: string
          created_by?: string | null
          date?: string
          day_of_week?: number
          id?: string
          is_active?: boolean
          max_members?: number
          session_cost?: number
          session_time?: string
        }
        Relationships: []
      }
      badminton_participants: {
        Row: {
          created_at: string | null
          day_id: string
          has_paid: boolean
          id: string
          slot: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          day_id: string
          has_paid?: boolean
          id?: string
          slot?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          day_id?: string
          has_paid?: boolean
          id?: string
          slot?: number | null
          user_id?: string
        }
        Relationships: []
      }
      badminton_settings: {
        Row: {
          id: string
          max_members: number
          play_days: number[]
          play_time: string
          session_price: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          max_members?: number
          play_days?: number[]
          play_time?: string
          session_price?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          max_members?: number
          play_days?: number[]
          play_time?: string
          session_price?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      core_member_opt_outs: {
        Row: {
          created_at: string
          day_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_member_opt_outs_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "badminton_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_member_opt_outs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      core_members: {
        Row: {
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      extra_expenses: {
        Row: {
          amount: number
          created_at: string
          day_id: string
          description: string | null
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          day_id: string
          description?: string | null
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          day_id?: string
          description?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extra_expenses_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "badminton_days"
            referencedColumns: ["id"]
          },
        ]
      }
      momo_transactions: {
        Row: {
          amount: number
          badminton_participant_id: string | null
          created_at: string | null
          id: string
          is_processed: boolean | null
          is_verified: boolean | null
          momo_trans_id: string | null
          order_id: string
          partner_code: string
          payment_status: string | null
          processed_at: string | null
          processing_started_at: string | null
          request_id: string
          signature: string | null
        }
        Insert: {
          amount: number
          badminton_participant_id?: string | null
          created_at?: string | null
          id?: string
          is_processed?: boolean | null
          is_verified?: boolean | null
          momo_trans_id?: string | null
          order_id: string
          partner_code: string
          payment_status?: string | null
          processed_at?: string | null
          processing_started_at?: string | null
          request_id: string
          signature?: string | null
        }
        Update: {
          amount?: number
          badminton_participant_id?: string | null
          created_at?: string | null
          id?: string
          is_processed?: boolean | null
          is_verified?: boolean | null
          momo_trans_id?: string | null
          order_id?: string
          partner_code?: string
          payment_status?: string | null
          processed_at?: string | null
          processing_started_at?: string | null
          request_id?: string
          signature?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "momo_transactions_badminton_participant_id_fkey"
            columns: ["badminton_participant_id"]
            isOneToOne: false
            referencedRelation: "badminton_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          id: string
          is_admin: boolean | null
          user_name: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          id: string
          is_admin?: boolean | null
          user_name?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          user_name?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_badminton_days: {
        Args: { _year: number; _month: number }
        Returns: {
          can_pay: boolean
          created_at: string
          created_by: string | null
          date: string
          day_of_week: number
          id: string
          is_active: boolean
          max_members: number
          session_cost: number
          session_time: string
        }[]
      }
      start_processing_transaction: {
        Args: { p_order_id: string }
        Returns: {
          amount: number
          badminton_participant_id: string | null
          created_at: string | null
          id: string
          is_processed: boolean | null
          is_verified: boolean | null
          momo_trans_id: string | null
          order_id: string
          partner_code: string
          payment_status: string | null
          processed_at: string | null
          processing_started_at: string | null
          request_id: string
          signature: string | null
        }[]
      }
      toggle_day_payment_status: {
        Args: { day_id_param: string; can_pay_param: boolean }
        Returns: boolean
      }
      update_badminton_settings: {
        Args: {
          _session_price: number
          _max_members: number
          _play_days: number[]
          _play_time: string
        }
        Returns: boolean
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
