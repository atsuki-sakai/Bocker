import { test as base } from '@playwright/test'

// テスト用のフィクスチャを定義
type TestFixtures = {
  // 将来的にConvexやSupabaseのモックデータを注入するためのフィクスチャ
  mockData: {
    organizations: any[]
    reservations: any[]
    customers: any[]
  }
}

export const test = base.extend<TestFixtures>({
  mockData: async ({}, use) => {
    // テスト用のモックデータを準備
    const mockData = {
      organizations: [
        {
          id: 'test-org-1',
          name: 'テストサロン',
          slug: 'test-salon',
        }
      ],
      reservations: [
        {
          id: 'test-reservation-1',
          customer_name: 'テスト顧客',
          menu_name: 'カット',
          start_time: new Date().toISOString(),
        }
      ],
      customers: [
        {
          id: 'test-customer-1',
          name: 'テスト顧客',
          email: 'test@example.com',
        }
      ]
    }
    
    await use(mockData)
  },
})

export { expect } from '@playwright/test'