export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      carte: {
        Row: {
          allergy_history: string | null
          created_at: string
          customer_uid: string
          deleted_at: string | null
          hair_type: string | null
          id: string
          is_archive: boolean
          ltv_price: number | null
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
          customer_uid: string
          deleted_at?: string | null
          hair_type?: string | null
          id?: string
          is_archive?: boolean
          ltv_price?: number | null
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
          customer_uid?: string
          deleted_at?: string | null
          hair_type?: string | null
          id?: string
          is_archive?: boolean
          ltv_price?: number | null
          medical_history?: string | null
          org_id?: string
          skin_type?: string | null
          sort_key?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "carte_customer_uid_fkey"
            columns: ["customer_uid"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["uid"]
          },
        ]
      }
      carte_detail: {
        Row: {
          after_images: Json | null
          carte_id: string
          created_at: string
          customer_requests: string | null
          deleted_at: string | null
          id: string
          is_archive: boolean
          menu_details: Json | null
          notes: string | null
          option_details: Json | null
          org_id: string
          reservation_id: string
          service_start_time: string | null
          sort_key: string | null
          staff_id: string
          staff_name: string | null
          tenant_id: string
          total_price: number | null
          updated_at: string
        }
        Insert: {
          after_images?: Json | null
          carte_id: string
          created_at?: string
          customer_requests?: string | null
          deleted_at?: string | null
          id?: string
          is_archive?: boolean
          menu_details?: Json | null
          notes?: string | null
          option_details?: Json | null
          org_id: string
          reservation_id: string
          service_start_time?: string | null
          sort_key?: string | null
          staff_id: string
          staff_name?: string | null
          tenant_id: string
          total_price?: number | null
          updated_at?: string
        }
        Update: {
          after_images?: Json | null
          carte_id?: string
          created_at?: string
          customer_requests?: string | null
          deleted_at?: string | null
          id?: string
          is_archive?: boolean
          menu_details?: Json | null
          notes?: string | null
          option_details?: Json | null
          org_id?: string
          reservation_id?: string
          service_start_time?: string | null
          sort_key?: string | null
          staff_id?: string
          staff_name?: string | null
          tenant_id?: string
          total_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "carte_detail_carte_id_fkey"
            columns: ["carte_id"]
            isOneToOne: false
            referencedRelation: "carte"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_transaction: {
        Row: {
          coupon_id: string
          created_at: string
          customer_uid: string
          deleted_at: string | null
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
          customer_uid: string
          deleted_at?: string | null
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
          customer_uid?: string
          deleted_at?: string | null
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
            foreignKeyName: "coupon_transaction_customer_uid_fkey"
            columns: ["customer_uid"]
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
          deleted_at: string | null
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
          deleted_at?: string | null
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
          deleted_at?: string | null
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
          customer_uid: string
          deleted_at: string | null
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
          customer_uid: string
          deleted_at?: string | null
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
          customer_uid?: string
          deleted_at?: string | null
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
          customer_uid: string
          deleted_at: string | null
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
          customer_uid: string
          deleted_at?: string | null
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
          customer_uid?: string
          deleted_at?: string | null
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
          customer_uid: string
          deleted_at: string | null
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
          customer_uid: string
          deleted_at?: string | null
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
          customer_uid?: string
          deleted_at?: string | null
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
            foreignKeyName: "point_task_queue_customer_uid_fkey"
            columns: ["customer_uid"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["uid"]
          },
        ]
      }
      point_transaction: {
        Row: {
          created_at: string
          customer_uid: string
          deleted_at: string | null
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
          customer_uid: string
          deleted_at?: string | null
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
          customer_uid?: string
          deleted_at?: string | null
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
            foreignKeyName: "point_transaction_customer_uid_fkey"
            columns: ["customer_uid"]
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
          assigned_staff_id: string | null
          assigned_staff_name: string | null
          assignment_timestamp: number | null
          cancel_reason: string | null
          cancelled_at: number | null
          cancelled_by: string | null
          created_at: string
          customer_name: string
          customer_uid: string | null
          date: string
          deleted_at: string | null
          end_time_unix: number
          is_archive: boolean
          is_free_nomination: boolean | null
          last_staff_change: Json | null
          org_id: string
          payment_status: string
          pending_expiry: number | null
          reminder_sent: boolean | null
          reminder_sent_at: number | null
          sort_key: string | null
          staff_id: string
          staff_name: string
          start_time_unix: number
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          tenant_id: string
          uid: string
          updated_at: string
        }
        Insert: {
          _convex_id: string
          _creation_time?: number | null
          assigned_staff_id?: string | null
          assigned_staff_name?: string | null
          assignment_timestamp?: number | null
          cancel_reason?: string | null
          cancelled_at?: number | null
          cancelled_by?: string | null
          created_at?: string
          customer_name: string
          customer_uid?: string | null
          date: string
          deleted_at?: string | null
          end_time_unix: number
          is_archive?: boolean
          is_free_nomination?: boolean | null
          last_staff_change?: Json | null
          org_id: string
          payment_status: string
          pending_expiry?: number | null
          reminder_sent?: boolean | null
          reminder_sent_at?: number | null
          sort_key?: string | null
          staff_id: string
          staff_name: string
          start_time_unix: number
          status: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          tenant_id: string
          uid?: string
          updated_at?: string
        }
        Update: {
          _convex_id?: string
          _creation_time?: number | null
          assigned_staff_id?: string | null
          assigned_staff_name?: string | null
          assignment_timestamp?: number | null
          cancel_reason?: string | null
          cancelled_at?: number | null
          cancelled_by?: string | null
          created_at?: string
          customer_name?: string
          customer_uid?: string | null
          date?: string
          deleted_at?: string | null
          end_time_unix?: number
          is_archive?: boolean
          is_free_nomination?: boolean | null
          last_staff_change?: Json | null
          org_id?: string
          payment_status?: string
          pending_expiry?: number | null
          reminder_sent?: boolean | null
          reminder_sent_at?: number | null
          sort_key?: string | null
          staff_id?: string
          staff_name?: string
          start_time_unix?: number
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          tenant_id?: string
          uid?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_customer_uid_fkey"
            columns: ["customer_uid"]
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
          cancellation_info: Json | null
          coupon_discount: number | null
          coupon_id: string | null
          created_at: string
          deleted_at: string | null
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
          cancellation_info?: Json | null
          coupon_discount?: number | null
          coupon_id?: string | null
          created_at?: string
          deleted_at?: string | null
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
          cancellation_info?: Json | null
          coupon_discount?: number | null
          coupon_id?: string | null
          created_at?: string
          deleted_at?: string | null
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
          deleted_at: string | null
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
          deleted_at?: string | null
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
          deleted_at?: string | null
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
          deleted_at: string | null
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
          deleted_at?: string | null
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
          deleted_at?: string | null
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
      batch_update_customer_points: {
        Args: { p_updates: Json[] }
        Returns: {
          customer_uid: string
          new_total_points: number
          success: boolean
          error_message: string
        }[]
      }
      bulk_update_point_task_status: {
        Args: { p_task_ids: string[]; p_status: string }
        Returns: number
      }
      convert_text_to_uuid: {
        Args: { input_text: string }
        Returns: string
      }
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
          p_customer_type?: string
        }
        Returns: {
          _creation_time: string | null
          created_at: string
          customer_type: string | null
          deleted_at: string | null
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
      delete_customer_and_related_data: {
        Args: { p_customer_uid: string }
        Returns: undefined
      }
      expire_points: {
        Args: { p_expiration_days?: number }
        Returns: {
          expired_count: number
          total_expired_points: number
        }[]
      }
      find_customer_by_text_uuid: {
        Args: { p_customer_uid: string; p_tenant_id: string; p_org_id: string }
        Returns: {
          uid: string
          tenant_id: string
          org_id: string
          line_id: string
          line_user_name: string
          phone: string
          email: string
          password: string
          password_hash: string
          first_name: string
          last_name: string
          searchable_text: string
          use_count: number
          last_reservation_date_unix: number
          initial_tracking: Json
          tags: string[]
          total_reservation_count: number
          customer_type: string
          sort_key: string
          _creation_time: string
          is_archive: boolean
          updated_time: string
          created_at: string
          updated_at: string
          deleted_at: string
        }[]
      }
      get_customer_stats_optimized: {
        Args: { p_tenant_id: string; p_org_id: string; p_customer_uid: string }
        Returns: {
          total_points: number
          total_earned_points: number
          total_used_points: number
          total_reservations: number
          last_reservation_date: string
          lifetime_value: number
        }[]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      recalculate_customer_points_balance: {
        Args: { p_customer_uid: string; p_tenant_id: string; p_org_id: string }
        Returns: {
          old_balance: number
          new_balance: number
          difference: number
        }[]
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
          created_at: string
          updated_at: string
          similarity_score: number
          total_reservation_count: number
          last_reservation_date_unix: number
        }[]
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      update_customer: {
        Args: {
          p_customer_uid: string
          p_tenant_id: string
          p_org_id: string
          p_email: string
          p_first_name: string
          p_last_name: string
          p_phone: string
          p_line_id: string
          p_line_user_name: string
          p_last_reservation_date_unix?: number
          p_total_reservation_count?: number
        }
        Returns: {
          _creation_time: string | null
          created_at: string
          customer_type: string | null
          deleted_at: string | null
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
      update_customer_json: {
        Args: { params: Json }
        Returns: {
          _creation_time: string | null
          created_at: string
          customer_type: string | null
          deleted_at: string | null
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
      update_customer_points_atomic: {
        Args: {
          p_customer_uid: string
          p_tenant_id: string
          p_org_id: string
          p_points_delta: number
          p_transaction_type: string
          p_description: string
          p_reservation_id?: string
        }
        Returns: {
          new_total_points: number
          transaction_id: string
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
          p_customer_type?: string
          p_total_reservation_count?: number
          p_last_reservation_date_unix?: number
        }
        Returns: {
          _creation_time: string | null
          created_at: string
          customer_type: string | null
          deleted_at: string | null
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
