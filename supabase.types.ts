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
          master_id: string
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
          master_id: string
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
          master_id?: string
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
        Relationships: []
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
          reservation_id: string | null
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
          reservation_id?: string | null
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
          reservation_id?: string | null
          sort_key?: string | null
          tenant_id?: string
          total_price?: number | null
          uid?: string
          updated_at?: string
          use_points?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reservation_detail_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservation"
            referencedColumns: ["uid"]
          },
        ]
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}