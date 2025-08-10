import { test as base } from '@playwright/test'
import { Doc, Id } from '@/convex/_generated/dataModel'
import { RowType } from '@/services/supabase/SupabaseService'
// テスト用のフィクスチャを定義
type TestFixtures = {
  // 将来的にConvexやSupabaseのモックデータを注入するためのフィクスチャ
  mockData: {
    organizations: Doc<'organization'>[]
    reservations: Doc<'reservation' | 'reservation_detail'>[]
    customers: RowType<'customer' | 'customer_detail'>[]
  }
}

export const test = base.extend<TestFixtures>({
  mockData: async ({}, use) => {
    // テスト用のモックデータを準備
    const mockData = {
      organizations: [
        {
          _id: 'test-org-1' as Id<'organization'>,
          _creationTime: Date.now(),
          tenant_id: 'test-tenant-1' as Id<'tenant'>,
          is_active: true,
          org_name: 'テストサロン',
          org_email: 'test@example.com',
          is_archive: false,
        },
      ],
      reservations: [
        {
          _id: 'test-reservation-1' as Id<'reservation'>,
          _creationTime: Date.now(),
          tenant_id: 'test-tenant-1' as Id<'tenant'>,
          org_id: 'test-org-1' as Id<'organization'>,
          customer_name: 'テスト顧客',
          status: 'confirmed' as const,
          payment_status: 'completed' as const,
          date: '2024-01-01',
          start_time_unix: Date.now(),
          end_time_unix: Date.now() + 3600000,
          is_archive: false,
        },
      ],
      customers: [
        {
          uid: 'test-customer-1',
          tenant_id: 'test-tenant-1',
          org_id: 'test-org-1',
          _creation_time: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          customer_type: null,
          deleted_at: null,
          email: 'test@example.com',
          first_name: 'テスト',
          last_name: '顧客',
          initial_tracking: null,
          is_archive: false,
          last_reservation_date_unix: null,
          line_id: null,
          line_user_name: null,
          password: null,
          password_hash: null,
          phone: null,
          searchable_text: null,
          sort_key: null,
          tags: null,
          total_reservation_count: null,
          updated_time: null,
          use_count: null,
        },
      ],
    }

    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(mockData)
  },
})

export { expect } from '@playwright/test'