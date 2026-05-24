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
      box_recipes: {
        Row: {
          box_id: string
          created_at: string
          id: string
          position: number
          quantity: number
          recipe_id: string
        }
        Insert: {
          box_id: string
          created_at?: string
          id?: string
          position?: number
          quantity?: number
          recipe_id: string
        }
        Update: {
          box_id?: string
          created_at?: string
          id?: string
          position?: number
          quantity?: number
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "box_recipes_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "box_recipes_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      boxes: {
        Row: {
          created_at: string
          id: string
          manual_ttc_price: number | null
          name: string
          packaging_cost: number
          pricing_mode: string
          updated_at: string
          user_id: string
          vat_rate: number
        }
        Insert: {
          created_at?: string
          id?: string
          manual_ttc_price?: number | null
          name: string
          packaging_cost?: number
          pricing_mode?: string
          updated_at?: string
          user_id: string
          vat_rate?: number
        }
        Update: {
          created_at?: string
          id?: string
          manual_ttc_price?: number | null
          name?: string
          packaging_cost?: number
          pricing_mode?: string
          updated_at?: string
          user_id?: string
          vat_rate?: number
        }
        Relationships: []
      }
      fixed_costs: {
        Row: {
          created_at: string
          electricity: number
          hours_per_month: number
          id: string
          other_charges: Json
          rent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          electricity?: number
          hours_per_month?: number
          id?: string
          other_charges?: Json
          rent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          electricity?: number
          hours_per_month?: number
          id?: string
          other_charges?: Json
          rent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          created_at: string
          id: string
          name: string
          pack_price: number
          pack_quantity: number
          unit: Database["public"]["Enums"]["ingredient_unit"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          pack_price: number
          pack_quantity: number
          unit?: Database["public"]["Enums"]["ingredient_unit"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          pack_price?: number
          pack_quantity?: number
          unit?: Database["public"]["Enums"]["ingredient_unit"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      labor_profiles: {
        Row: {
          created_at: string
          hourly_rate: number
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hourly_rate: number
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hourly_rate?: number
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recipe_cost_lines: {
        Row: {
          created_at: string
          free_amount: number | null
          free_label: string | null
          id: string
          ingredient_id: string | null
          labor_profile_id: string | null
          minutes: number | null
          position: number
          quantity: number | null
          recipe_id: string
          type: Database["public"]["Enums"]["cost_line_type"]
        }
        Insert: {
          created_at?: string
          free_amount?: number | null
          free_label?: string | null
          id?: string
          ingredient_id?: string | null
          labor_profile_id?: string | null
          minutes?: number | null
          position?: number
          quantity?: number | null
          recipe_id: string
          type: Database["public"]["Enums"]["cost_line_type"]
        }
        Update: {
          created_at?: string
          free_amount?: number | null
          free_label?: string | null
          id?: string
          ingredient_id?: string | null
          labor_profile_id?: string | null
          minutes?: number | null
          position?: number
          quantity?: number | null
          recipe_id?: string
          type?: Database["public"]["Enums"]["cost_line_type"]
        }
        Relationships: [
          {
            foreignKeyName: "recipe_cost_lines_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_cost_lines_labor_profile_id_fkey"
            columns: ["labor_profile_id"]
            isOneToOne: false
            referencedRelation: "labor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_cost_lines_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_extra_fees: {
        Row: {
          amount_per_piece: number
          created_at: string
          id: string
          label: string
          recipe_id: string
        }
        Insert: {
          amount_per_piece?: number
          created_at?: string
          id?: string
          label: string
          recipe_id: string
        }
        Update: {
          amount_per_piece?: number
          created_at?: string
          id?: string
          label?: string
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_extra_fees_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          manual_ttc_price: number | null
          pricing_mode: Database["public"]["Enums"]["pricing_mode"]
          target_margin_percent: number
          title: string
          updated_at: string
          user_id: string
          vat_rate: number
          yield_pieces: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          manual_ttc_price?: number | null
          pricing_mode?: Database["public"]["Enums"]["pricing_mode"]
          target_margin_percent?: number
          title: string
          updated_at?: string
          user_id: string
          vat_rate?: number
          yield_pieces?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          manual_ttc_price?: number | null
          pricing_mode?: Database["public"]["Enums"]["pricing_mode"]
          target_margin_percent?: number
          title?: string
          updated_at?: string
          user_id?: string
          vat_rate?: number
          yield_pieces?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      cost_line_type: "ingredient" | "labor" | "free"
      ingredient_unit: "g" | "kg" | "ml" | "L" | "unite" | "sachet"
      pricing_mode: "margin" | "price"
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
      cost_line_type: ["ingredient", "labor", "free"],
      ingredient_unit: ["g", "kg", "ml", "L", "unite", "sachet"],
      pricing_mode: ["margin", "price"],
    },
  },
} as const
