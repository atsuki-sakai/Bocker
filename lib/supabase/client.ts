import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Supabaseクライアントの初期化
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// サービスロールキーを使用した管理用クライアント（サーバーサイドのみで使用）
let adminClient: ReturnType<typeof createClient<Database>> | null = null

export function getAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('Admin client can only be used on the server')
  }

  if (!adminClient) {
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    if (!supabaseServiceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined')
    }

    adminClient = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  return adminClient
}
