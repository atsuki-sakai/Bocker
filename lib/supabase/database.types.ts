export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      point_history: {
        Row: {
          id: string
          salon_id: string
          customer_id: string
          reservation_id: string | null
          points: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          salon_id: string
          customer_id: string
          reservation_id?: string | null
          points: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          salon_id?: string
          customer_id?: string
          reservation_id?: string | null
          points?: number
          created_at?: string
          updated_at?: string
        }
      }
      reservations_history: {
        Row: {
          id: string
          salon_id: string
          customer_id: string
          staff_id: string
          menu_id: string | null
          status: string
          start_time: string
          end_time: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          salon_id: string
          customer_id: string
          staff_id: string
          menu_id?: string | null
          status: string
          start_time: string
          end_time: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          salon_id?: string
          customer_id?: string
          staff_id?: string
          menu_id?: string | null
          status?: string
          start_time?: string
          end_time?: string
          created_at?: string
          updated_at?: string
        }
      }
      payment_history: {
        Row: {
          id: string
          salon_id: string
          customer_id: string
          reservation_id: string | null
          amount: number
          status: string
          payment_method: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          salon_id: string
          customer_id: string
          reservation_id?: string | null
          amount: number
          status: string
          payment_method: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          salon_id?: string
          customer_id?: string
          reservation_id?: string | null
          amount?: number
          status?: string
          payment_method?: string
          created_at?: string
          updated_at?: string
        }
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
  }
}
