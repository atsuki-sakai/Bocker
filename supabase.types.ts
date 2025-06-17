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
      carte: {
        Row: {
          allergy_history: string | null
          created_at: string
          customer_id: string
          hair_type: string | null
          id: string
          is_archive: boolean
          medical_history: string | null
          org_id: string
          skin_type: string | null
          sort_key: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          allergy_history?: string | null
          created_at?: string
          customer_id: string
          hair_type?: string | null
          id?: string
          is_archive?: boolean
          medical_history?: string | null
          org_id: string
          skin_type?: string | null
          sort_key?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          allergy_history?: string | null
          created_at?: string
          customer_id?: string
          hair_type?: string | null
          id?: string
          is_archive?: boolean
          medical_history?: string | null
          org_id?: string
          skin_type?: string | null
          sort_key?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "carte_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["uid"]
          },
        ]
      }
      carte_detail: {
        Row: {
          after_hair_img_path: string | null
          before_hair_img_path: string | null
          carte_id: string
          created_at: string
          customer_requests: string | null
          id: string
          is_archive: boolean
          menu_details_json: Json | null
          notes: string | null
          org_id: string
          reservation_id: string
          sort_key: string | null
          staff_id: string
          tenant_id: string
          updated_at: string
          used_products_json: Json | null
        }
        Insert: {
          after_hair_img_path?: string | null
          before_hair_img_path?: string | null
          carte_id: string
          created_at?: string
          customer_requests?: string | null
          id?: string
          is_archive?: boolean
          menu_details_json?: Json | null
          notes?: string | null
          org_id: string
          reservation_id: string
          sort_key?: string | null
          staff_id: string
          tenant_id: string
          updated_at?: string
          used_products_json?: Json | null
        }
        Update: {
          after_hair_img_path?: string | null
          before_hair_img_path?: string | null
          carte_id?: string
          created_at?: string
          customer_requests?: string | null
          id?: string
          is_archive?: boolean
          menu_details_json?: Json | null
          notes?: string | null
          org_id?: string
          reservation_id?: string
          sort_key?: string | null
          staff_id?: string
          tenant_id?: string
          updated_at?: string
          used_products_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "carte_detail_carte_id_fkey"
            columns: ["carte_id"]
            isOneToOne: false
            referencedRelation: "carte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carte_detail_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservation"
            referencedColumns: ["uid"]
          },
        ]
      }
      coupon_transaction: {
        Row: {
          coupon_id: string
          created_at: string
          customer_id: string
          discount_amount: number | null
          id: string
          is_archive: boolean
          org_id: string
          reservation_id: string
          sort_key: string | null
          tenant_id: string
          transaction_date_unix: number
          updated_at: string
        }
        Insert: {
          coupon_id: string
          created_at?: string
          customer_id: string
          discount_amount?: number | null
          id?: string
          is_archive?: boolean
          org_id: string
          reservation_id: string
          sort_key?: string | null
          tenant_id: string
          transaction_date_unix: number
          updated_at?: string
        }
        Update: {
          coupon_id?: string
          created_at?: string
          customer_id?: string
          discount_amount?: number | null
          id?: string
          is_archive?: boolean
          org_id?: string
          reservation_id?: string
          sort_key?: string | null
          tenant_id?: string
          transaction_date_unix?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_transaction_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["uid"]
          },
        ]
      }
      customer: {
        Row: {
          _creation_time: string | null
          created_at: string
          customer_type: string | null
          email: string | null
          first_name: string | null
          initial_tracking: Json | null
          is_archive: boolean | null
          last_name: string | null
          last_reservation_date_unix: number | null
          line_id: string | null
          line_user_name: string | null
          org_id: string
          password: string | null
          password_hash: string | null
          phone: string | null
          searchable_text: string | null
          sort_key: string | null
          tags: string[] | null
          tenant_id: string
          total_reservation_count: number | null
          uid: string
          updated_at: string
          updated_time: string | null
          use_count: number | null
        }
        Insert: {
          _creation_time?: string | null
          created_at?: string
          customer_type?: string | null
          email?: string | null
          first_name?: string | null
          initial_tracking?: Json | null
          is_archive?: boolean | null
          last_name?: string | null
          last_reservation_date_unix?: number | null
          line_id?: string | null
          line_user_name?: string | null
          org_id?: string
          password?: string | null
          password_hash?: string | null
          phone?: string | null
          searchable_text?: string | null
          sort_key?: string | null
          tags?: string[] | null
          tenant_id?: string
          total_reservation_count?: number | null
          uid: string
          updated_at?: string
          updated_time?: string | null
          use_count?: number | null
        }
        Update: {
          _creation_time?: string | null
          created_at?: string
          customer_type?: string | null
          email?: string | null
          first_name?: string | null
          initial_tracking?: Json | null
          is_archive?: boolean | null
          last_name?: string | null
          last_reservation_date_unix?: number | null
          line_id?: string | null
          line_user_name?: string | null
          org_id?: string
          password?: string | null
          password_hash?: string | null
          phone?: string | null
          searchable_text?: string | null
          sort_key?: string | null
          tags?: string[] | null
          tenant_id?: string
          total_reservation_count?: number | null
          uid?: string
          updated_at?: string
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
          created_at: string
          customer_id: string | null
          customer_uid: string
          email: string | null
          gender: string | null
          is_archive: boolean | null
          notes: string | null
          org_id: string
          sort_key: string | null
          tenant_id: string
          uid: string
          updated_at: string
          updated_time: string | null
        }
        Insert: {
          _creation_time?: string | null
          age?: number | null
          birthday?: string | null
          created_at?: string
          customer_id?: string | null
          customer_uid: string
          email?: string | null
          gender?: string | null
          is_archive?: boolean | null
          notes?: string | null
          org_id?: string
          sort_key?: string | null
          tenant_id?: string
          uid: string
          updated_at?: string
          updated_time?: string | null
        }
        Update: {
          _creation_time?: string | null
          age?: number | null
          birthday?: string | null
          created_at?: string
          customer_id?: string | null
          customer_uid?: string
          email?: string | null
          gender?: string | null
          is_archive?: boolean | null
          notes?: string | null
          org_id?: string
          sort_key?: string | null
          tenant_id?: string
          uid?: string
          updated_at?: string
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
          created_at: string
          customer_id: string | null
          customer_uid: string
          is_archive: boolean | null
          last_transaction_date_unix: number | null
          org_id: string
          sort_key: string | null
          tenant_id: string
          total_points: number | null
          uid: string
          updated_at: string
          updated_time: string | null
        }
        Insert: {
          _creation_time?: string | null
          created_at?: string
          customer_id?: string | null
          customer_uid: string
          is_archive?: boolean | null
          last_transaction_date_unix?: number | null
          org_id?: string
          sort_key?: string | null
          tenant_id?: string
          total_points?: number | null
          uid: string
          updated_at?: string
          updated_time?: string | null
        }
        Update: {
          _creation_time?: string | null
          created_at?: string
          customer_id?: string | null
          customer_uid?: string
          is_archive?: boolean | null
          last_transaction_date_unix?: number | null
          org_id?: string
          sort_key?: string | null
          tenant_id?: string
          total_points?: number | null
          uid?: string
          updated_at?: string
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
      point_task_queue: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          is_archive: boolean
          org_id: string
          points: number | null
          reservation_id: string | null
          scheduled_for_unix: number | null
          sort_key: string | null
          status: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          is_archive?: boolean
          org_id: string
          points?: number | null
          reservation_id?: string | null
          scheduled_for_unix?: number | null
          sort_key?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          is_archive?: boolean
          org_id?: string
          points?: number | null
          reservation_id?: string | null
          scheduled_for_unix?: number | null
          sort_key?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_point_task_queue_customer"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["uid"]
          },
        ]
      }
      point_transaction: {
        Row: {
          created_at: string
          customer_id: string
          description: string | null
          id: string
          is_archive: boolean
          org_id: string
          points: number
          reservation_id: string | null
          sort_key: string | null
          tenant_id: string
          transaction_date_unix: number
          transaction_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          description?: string | null
          id?: string
          is_archive?: boolean
          org_id: string
          points: number
          reservation_id?: string | null
          sort_key?: string | null
          tenant_id: string
          transaction_date_unix: number
          transaction_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          description?: string | null
          id?: string
          is_archive?: boolean
          org_id?: string
          points?: number
          reservation_id?: string | null
          sort_key?: string | null
          tenant_id?: string
          transaction_date_unix?: number
          transaction_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_point_transaction_customer"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["uid"]
          },
        ]
      }
      reservation: {
        Row: {
          _convex_id: string
          _creation_time: number | null
          created_at: string
          customer_id: string | null
          customer_name: string
          date: string
          end_time_unix: number
          is_archive: boolean
          org_id: string
          payment_status: string
          sort_key: string | null
          staff_id: string
          staff_name: string
          start_time_unix: number
          status: string
          stripe_checkout_session_id: string | null
          tenant_id: string
          uid: string
          updated_at: string
        }
        Insert: {
          _convex_id: string
          _creation_time?: number | null
          created_at?: string
          customer_id?: string | null
          customer_name: string
          date: string
          end_time_unix: number
          is_archive?: boolean
          org_id: string
          payment_status: string
          sort_key?: string | null
          staff_id: string
          staff_name: string
          start_time_unix: number
          status: string
          stripe_checkout_session_id?: string | null
          tenant_id: string
          uid?: string
          updated_at?: string
        }
        Update: {
          _convex_id?: string
          _creation_time?: number | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          date?: string
          end_time_unix?: number
          is_archive?: boolean
          org_id?: string
          payment_status?: string
          sort_key?: string | null
          staff_id?: string
          staff_name?: string
          start_time_unix?: number
          status?: string
          stripe_checkout_session_id?: string | null
          tenant_id?: string
          uid?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_reservation_customer"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["uid"]
          },
        ]
      }
      reservation_detail: {
        Row: {
          _convex_id: string
          _convex_reservation_id: string
          _creation_time: number | null
          coupon_discount: number | null
          coupon_id: string | null
          created_at: string
          extra_charge: number | null
          featured_hair_images: Json | null
          is_archive: boolean
          menus: Json | null
          notes: string | null
          options: Json | null
          org_id: string
          payment_method: string
          reservation_id: string
          sort_key: string | null
          tenant_id: string
          total_price: number | null
          uid: string
          updated_at: string
          use_points: number | null
        }
        Insert: {
          _convex_id: string
          _convex_reservation_id: string
          _creation_time?: number | null
          coupon_discount?: number | null
          coupon_id?: string | null
          created_at?: string
          extra_charge?: number | null
          featured_hair_images?: Json | null
          is_archive?: boolean
          menus?: Json | null
          notes?: string | null
          options?: Json | null
          org_id: string
          payment_method: string
          reservation_id: string
          sort_key?: string | null
          tenant_id: string
          total_price?: number | null
          uid?: string
          updated_at?: string
          use_points?: number | null
        }
        Update: {
          _convex_id?: string
          _convex_reservation_id?: string
          _creation_time?: number | null
          coupon_discount?: number | null
          coupon_id?: string | null
          created_at?: string
          extra_charge?: number | null
          featured_hair_images?: Json | null
          is_archive?: boolean
          menus?: Json | null
          notes?: string | null
          options?: Json | null
          org_id?: string
          payment_method?: string
          reservation_id?: string
          sort_key?: string | null
          tenant_id?: string
          total_price?: number | null
          uid?: string
          updated_at?: string
          use_points?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reservation_detail_convex_reservation_id_fkey"
            columns: ["_convex_reservation_id"]
            isOneToOne: false
            referencedRelation: "reservation"
            referencedColumns: ["_convex_id"]
          },
        ]
      }
      tracking_event: {
        Row: {
          created_at: string
          custom_data_json: Json | null
          event_source: string
          event_timestamp_unix: number
          event_type: string
          id: string
          is_archive: boolean
          org_id: string
          page_title: string | null
          page_url: string | null
          session_id: string
          sort_key: string | null
          target_element: string | null
          tenant_id: string
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          created_at?: string
          custom_data_json?: Json | null
          event_source: string
          event_timestamp_unix: number
          event_type: string
          id?: string
          is_archive?: boolean
          org_id: string
          page_title?: string | null
          page_url?: string | null
          session_id: string
          sort_key?: string | null
          target_element?: string | null
          tenant_id: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          created_at?: string
          custom_data_json?: Json | null
          event_source?: string
          event_timestamp_unix?: number
          event_type?: string
          id?: string
          is_archive?: boolean
          org_id?: string
          page_title?: string | null
          page_url?: string | null
          session_id?: string
          sort_key?: string | null
          target_element?: string | null
          tenant_id?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      tracking_summaries: {
        Row: {
          conversion_count: number | null
          created_at: string
          dimension_type: string
          dimension_value: string
          id: string
          is_archive: boolean
          org_id: string
          sort_key: string | null
          summary_date: string
          tenant_id: string
          total_count: number
          unique_user_count: number | null
          updated_at: string
        }
        Insert: {
          conversion_count?: number | null
          created_at?: string
          dimension_type: string
          dimension_value: string
          id?: string
          is_archive?: boolean
          org_id: string
          sort_key?: string | null
          summary_date: string
          tenant_id: string
          total_count: number
          unique_user_count?: number | null
          updated_at?: string
        }
        Update: {
          conversion_count?: number | null
          created_at?: string
          dimension_type?: string
          dimension_value?: string
          id?: string
          is_archive?: boolean
          org_id?: string
          sort_key?: string | null
          summary_date?: string
          tenant_id?: string
          total_count?: number
          unique_user_count?: number | null
          updated_at?: string
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
          p_tenant_id: string
          p_org_id: string
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
          uid: string
          email: string
          first_name: string
          last_name: string
          phone: string
          tenant_id: string
          org_id: string
          line_id: string
          line_user_name: string
          _creation_time: string
          updated_time: string
          searchable_text: string
          is_archive: boolean
        }[]
      }
      delete_customer_and_related_data: {
        Args: { p_customer_uid: string }
        Returns: undefined
      }
      search_customers_by_similarity: {
        Args: {
          p_tenant_id: string
          p_org_id: string
          p_search_term: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          uid: string
          email: string
          first_name: string
          last_name: string
          phone: string
          line_id: string
          line_user_name: string
          tenant_id: string
          org_id: string
          _creation_time: string
          updated_time: string
          similarity_score: number
        }[]
      }
      update_customer_with_details_and_points: {
        Args: {
          p_customer_uid: string
          p_detail_age: number
          p_detail_birthday: string
          p_detail_email: string
          p_detail_gender: string
          p_detail_notes: string
          p_email: string
          p_first_name: string
          p_last_name: string
          p_line_id: string
          p_line_user_name: string
          p_org_id: string
          p_phone: string
          p_tags: string[]
          p_tenant_id: string
          p_total_points: number
        }
        Returns: {
          _creation_time: string | null
          created_at: string
          customer_type: string | null
          email: string | null
          first_name: string | null
          initial_tracking: Json | null
          is_archive: boolean | null
          last_name: string | null
          last_reservation_date_unix: number | null
          line_id: string | null
          line_user_name: string | null
          org_id: string
          password: string | null
          password_hash: string | null
          phone: string | null
          searchable_text: string | null
          sort_key: string | null
          tags: string[] | null
          tenant_id: string
          total_reservation_count: number | null
          uid: string
          updated_at: string
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