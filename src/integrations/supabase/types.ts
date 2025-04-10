export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      badminton_days: {
        Row: {
          created_at: string;
          created_by: string | null;
          date: string;
          day_of_week: number;
          id: string;
          is_active: boolean;
          max_members: number;
          session_cost: number;
          session_time: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          date: string;
          day_of_week: number;
          id?: string;
          is_active?: boolean;
          max_members?: number;
          session_cost?: number;
          session_time?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          date?: string;
          day_of_week?: number;
          id?: string;
          is_active?: boolean;
          max_members?: number;
          session_cost?: number;
          session_time?: string;
        };
        Relationships: [];
      };
      badminton_participants: {
        Row: {
          created_at: string | null;
          day_id: string;
          has_paid: boolean;
          id: string;
          slot: number | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          day_id: string;
          has_paid?: boolean;
          id?: string;
          slot?: number | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          day_id?: string;
          has_paid?: boolean;
          id?: string;
          slot?: number | null;
          user_id?: string;
        };
        Relationships: [];
      };
      badminton_settings: {
        Row: {
          id: string;
          max_members: number;
          play_days: number[];
          play_time: string;
          session_price: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          max_members?: number;
          play_days?: number[];
          play_time?: string;
          session_price?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          max_members?: number;
          play_days?: number[];
          play_time?: string;
          session_price?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      core_member_opt_outs: {
        Row: {
          id: string;
          day_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          day_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          day_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "core_member_opt_outs_day_id_fkey";
            columns: ["day_id"];
            isOneToOne: false;
            referencedRelation: "badminton_days";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "core_member_opt_outs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      core_members: {
        Row: {
          created_at: string | null;
          id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      extra_expenses: {
        Row: {
          amount: number;
          created_at: string;
          day_id: string;
          description: string | null;
          id: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          day_id: string;
          description?: string | null;
          id?: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          day_id?: string;
          description?: string | null;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "extra_expenses_day_id_fkey";
            columns: ["day_id"];
            isOneToOne: false;
            referencedRelation: "badminton_days";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          id: string;
          is_admin: boolean | null;
          user_name: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          id: string;
          is_admin?: boolean | null;
          user_name?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          id?: string;
          is_admin?: boolean | null;
          user_name?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      generate_badminton_days: {
        Args: {
          _year: number;
          _month: number;
        };
        Returns: {
          created_at: string;
          created_by: string | null;
          date: string;
          day_of_week: number;
          id: string;
          is_active: boolean;
          max_members: number;
          session_cost: number;
          session_time: string;
        }[];
      };
      update_badminton_settings: {
        Args: {
          _session_price: number;
          _max_members: number;
          _play_days: number[];
          _play_time: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
      PublicSchema["Views"])
  ? (PublicSchema["Tables"] &
      PublicSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][PublicEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
  ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;
