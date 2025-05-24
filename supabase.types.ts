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
      customer: {
        Row: {
          _creation_time: string | null
          email: string | null
          first_name: string | null
          initial_tracking: Json | null
          is_archive: boolean | null
          last_name: string | null
          last_reservation_date_unix: string | null
          line_id: string | null
          line_user_name: string | null
          password_hash: string | null
          phone: string | null
          salon_id: string | null
          searchable_text: string | null
          tags: Json | null
          uid: string
          updated_time: string | null
          use_count: number | null
        }
        Insert: {
          _creation_time?: string | null
          email?: string | null
          first_name?: string | null
          initial_tracking?: Json | null
          is_archive?: boolean | null
          last_name?: string | null
          last_reservation_date_unix?: string | null
          line_id?: string | null
          line_user_name?: string | null
          password_hash?: string | null
          phone?: string | null
          salon_id?: string | null
          searchable_text?: string | null
          tags?: Json | null
          uid: string
          updated_time?: string | null
          use_count?: number | null
        }
        Update: {
          _creation_time?: string | null
          email?: string | null
          first_name?: string | null
          initial_tracking?: Json | null
          is_archive?: boolean | null
          last_name?: string | null
          last_reservation_date_unix?: string | null
          line_id?: string | null
          line_user_name?: string | null
          password_hash?: string | null
          phone?: string | null
          salon_id?: string | null
          searchable_text?: string | null
          tags?: Json | null
          uid?: string
          updated_time?: string | null
          use_count?: number | null
        }
        Relationships: []
      }
      customer_detail: {
        Row: {
          _creation_time: string | null
          age: number | null
          birthday: string | null
          customer_uid: string
          email: string | null
          gender: string | null
          is_archive: boolean | null
          notes: string | null
          uid: string
          updated_time: string | null
        }
        Insert: {
          _creation_time?: string | null
          age?: number | null
          birthday?: string | null
          customer_uid: string
          email?: string | null
          gender?: string | null
          is_archive?: boolean | null
          notes?: string | null
          uid: string
          updated_time?: string | null
        }
        Update: {
          _creation_time?: string | null
          age?: number | null
          birthday?: string | null
          customer_uid?: string
          email?: string | null
          gender?: string | null
          is_archive?: boolean | null
          notes?: string | null
          uid?: string
          updated_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_detail_customer_uid_fkey"
            columns: ["customer_uid"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["uid"]
          },
        ]
      }
      customer_points: {
        Row: {
          _creation_time: string | null
          customer_uid: string
          is_archive: boolean | null
          last_transaction_date_unix: number | null
          salon_id: string | null
          total_points: number | null
          uid: string
          updated_time: string | null
        }
        Insert: {
          _creation_time?: string | null
          customer_uid: string
          is_archive?: boolean | null
          last_transaction_date_unix?: number | null
          salon_id?: string | null
          total_points?: number | null
          uid: string
          updated_time?: string | null
        }
        Update: {
          _creation_time?: string | null
          customer_uid?: string
          is_archive?: boolean | null
          last_transaction_date_unix?: number | null
          salon_id?: string | null
          total_points?: number | null
          uid?: string
          updated_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_points_customer_uid_fkey"
            columns: ["customer_uid"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["uid"]
          },
        ]
      }
      reservation: {
        Row: {
          _creation_time: string | null
          _id: string
          coupon_discount: number | null
          coupon_id: string | null
          customer_id: string | null
          customer_name: string | null
          end_time_unix: string | null
          featured_hair_img_path: string | null
          is_archive: boolean | null
          menus: Json | null
          notes: string | null
          options: Json | null
          payment_method: string | null
          salon_id: string | null
          staff_id: string | null
          staff_name: string | null
          start_time_unix: string | null
          status: string | null
          total_price: number | null
          unit_price: number | null
          updated_time: string | null
          use_points: number | null
        }
        Insert: {
          _creation_time?: string | null
          _id: string
          coupon_discount?: number | null
          coupon_id?: string | null
          customer_id?: string | null
          customer_name?: string | null
          end_time_unix?: string | null
          featured_hair_img_path?: string | null
          is_archive?: boolean | null
          menus?: Json | null
          notes?: string | null
          options?: Json | null
          payment_method?: string | null
          salon_id?: string | null
          staff_id?: string | null
          staff_name?: string | null
          start_time_unix?: string | null
          status?: string | null
          total_price?: number | null
          unit_price?: number | null
          updated_time?: string | null
          use_points?: number | null
        }
        Update: {
          _creation_time?: string | null
          _id?: string
          coupon_discount?: number | null
          coupon_id?: string | null
          customer_id?: string | null
          customer_name?: string | null
          end_time_unix?: string | null
          featured_hair_img_path?: string | null
          is_archive?: boolean | null
          menus?: Json | null
          notes?: string | null
          options?: Json | null
          payment_method?: string | null
          salon_id?: string | null
          staff_id?: string | null
          staff_name?: string | null
          start_time_unix?: string | null
          status?: string | null
          total_price?: number | null
          unit_price?: number | null
          updated_time?: string | null
          use_points?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_customer_with_details_and_points: {
        Args: {
          p_email: string
          p_first_name: string
          p_last_name: string
          p_phone: string
          p_salon_id: string
          p_line_id: string
          p_line_user_name: string
          p_password_hash: string
          p_detail_email: string
          p_detail_gender: string
          p_detail_birthday: string
          p_detail_age: number
          p_detail_notes: string
          p_initial_points: number
        }
        Returns: {
          _creation_time: string | null
          email: string | null
          first_name: string | null
          initial_tracking: Json | null
          is_archive: boolean | null
          last_name: string | null
          last_reservation_date_unix: string | null
          line_id: string | null
          line_user_name: string | null
          password_hash: string | null
          phone: string | null
          salon_id: string | null
          searchable_text: string | null
          tags: Json | null
          uid: string
          updated_time: string | null
          use_count: number | null
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
