import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  LANGUAGES,
  ALLOWED_DOMAINS,
  SCHEDULE_HOURS,
  RESERVATION_CANCEL_LIMIT_DAYS,
  RESERVATION_LIMIT_DAYS,
  PLAN_TRIAL_DAYS,
  PLAN_CHARGE_MONTHS_YEARLY,
  PLAN_DURATION_MONTHS,
  PLAN_MONTHLY_PRICES,
  PLAN_YEARLY_PRICES,
  SUBSCRIPTION_PLANS,
  COOKIE_EXPIRES_DAYS,
  POINT_EXPIRATION_DAYS,
  BASE_URL,
  BASE_REFERRAL_DISCOUNT_AMOUNT,
  MAX_REFERRAL_COUNT,
  NAV_ITEMS,
  DASHBOARD_ITEM,
  NAV_GROUPS,
  type Languages,
  type NavItem,
  type NavGroup,
} from '../constants'

// Mock dependencies
vi.mock('../env-config', () => ({
  getAppUrl: vi.fn(() => 'https://test.bocker.jp'),
  getEnv: vi.fn((key: string) => {
    const mockEnvs: Record<string, string> = {
      NEXT_PUBLIC_MICRO_MONTHLY_PRC_ID: 'price_micro_monthly_test',
      NEXT_PUBLIC_MICRO_YEARLY_PRC_ID: 'price_micro_yearly_test',
      NEXT_PUBLIC_LITE_MONTHLY_PRC_ID: 'price_lite_monthly_test',
      NEXT_PUBLIC_LITE_YEARLY_PRC_ID: 'price_lite_yearly_test',
      NEXT_PUBLIC_PRO_MONTHLY_PRC_ID: 'price_pro_monthly_test',
      NEXT_PUBLIC_PRO_YEARLY_PRC_ID: 'price_pro_yearly_test',
    }
    return mockEnvs[key] || ''
  }),
}))

describe('constants ライブラリ', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('言語設定', () => {
    it('サポートされている言語が正しく定義されている', () => {
      expect(LANGUAGES).toEqual(['ja', 'en', 'th'])
      expect(LANGUAGES).toHaveLength(3)
    })

    it('Languages型が正しく推論される', () => {
      const jaLang: Languages = 'ja'
      const enLang: Languages = 'en'
      const thLang: Languages = 'th'

      expect(jaLang).toBe('ja')
      expect(enLang).toBe('en')
      expect(thLang).toBe('th')
    })
  })

  describe('セキュリティ設定', () => {
    it('許可ドメインが適切に設定されている', () => {
      expect(ALLOWED_DOMAINS).toContain('localhost')
      expect(ALLOWED_DOMAINS).toContain('bocker.jp')
      expect(ALLOWED_DOMAINS).toContain('bocker-project.vercel.app')
      expect(ALLOWED_DOMAINS).toHaveLength(3)
    })

    it('BASE_URLが正しく設定されている', () => {
      expect(BASE_URL).toBe('https://test.bocker.jp')
    })
  })

  describe('営業時間設定', () => {
    it('24時間分の営業時間が正しく定義されている', () => {
      expect(SCHEDULE_HOURS).toHaveLength(24)
      expect(SCHEDULE_HOURS[0]).toBe('00:00')
      expect(SCHEDULE_HOURS[9]).toBe('09:00')
      expect(SCHEDULE_HOURS[23]).toBe('23:00')
    })

    it('営業時間がHH:mm形式で統一されている', () => {
      SCHEDULE_HOURS.forEach((hour) => {
        expect(hour).toMatch(/^([01]\d|2[0-3]):00$/)
      })
    })
  })

  describe('予約設定', () => {
    it('予約キャンセル可能期限が1-30日で定義されている', () => {
      expect(RESERVATION_CANCEL_LIMIT_DAYS).toHaveLength(30)
      expect(RESERVATION_CANCEL_LIMIT_DAYS[0]).toBe('1')
      expect(RESERVATION_CANCEL_LIMIT_DAYS[29]).toBe('30')
    })

    it('予約可能期限が適切に設定されている', () => {
      expect(RESERVATION_LIMIT_DAYS).toEqual(['7', '14', '30', '60', '90'])
      expect(RESERVATION_LIMIT_DAYS).toHaveLength(5)
    })
  })

  describe('料金プラン設定', () => {
    it('プラン基本設定が正しく定義されている', () => {
      expect(PLAN_TRIAL_DAYS).toBe(30)
      expect(PLAN_CHARGE_MONTHS_YEARLY).toBe(10)
    })

    it('プラン期間が正しく計算されている', () => {
      expect(PLAN_DURATION_MONTHS.MONTHLY).toBe(1)
      expect(PLAN_DURATION_MONTHS.YEARLY).toBe(10)
    })

    it('月額料金が適切に設定されている', () => {
      expect(PLAN_MONTHLY_PRICES.MICRO).toBe(4000)
      expect(PLAN_MONTHLY_PRICES.LITE).toBe(8000)
      expect(PLAN_MONTHLY_PRICES.PRO).toBe(12000)
    })

    it('年額料金と割引率が正しく計算されている', () => {
      // LITEプランの例
      const liteYearlyPrice = PLAN_MONTHLY_PRICES.LITE * PLAN_CHARGE_MONTHS_YEARLY
      const liteOriginalYearlyPrice = PLAN_MONTHLY_PRICES.LITE * 12
      const liteSavingPercent = (
        ((liteOriginalYearlyPrice - liteYearlyPrice) / liteOriginalYearlyPrice) *
        100
      ).toFixed(0)

      expect(PLAN_YEARLY_PRICES.LITE.price).toBe(liteYearlyPrice)
      expect(PLAN_YEARLY_PRICES.LITE.savingPercent).toBe(liteSavingPercent)
    })

    it('サブスクリプションプランが環境変数から正しく生成される', () => {
      expect(SUBSCRIPTION_PLANS.LITE.id).toBe('lite')
      expect(SUBSCRIPTION_PLANS.LITE.name).toBe('Lite')
      expect(SUBSCRIPTION_PLANS.LITE.monthly.priceId).toBe('price_lite_monthly_test')
      expect(SUBSCRIPTION_PLANS.LITE.yearly.priceId).toBe('price_lite_yearly_test')

      expect(SUBSCRIPTION_PLANS.PRO.id).toBe('pro')
      expect(SUBSCRIPTION_PLANS.PRO.name).toBe('Pro')
      expect(SUBSCRIPTION_PLANS.PRO.monthly.priceId).toBe('price_pro_monthly_test')
      expect(SUBSCRIPTION_PLANS.PRO.yearly.priceId).toBe('price_pro_yearly_test')
    })
  })

  describe('その他の設定', () => {
    it('Cookie有効期限が適切に設定されている', () => {
      expect(COOKIE_EXPIRES_DAYS).toBe(7)
    })

    it('ポイント有効期限オプションが適切に設定されている', () => {
      expect(POINT_EXPIRATION_DAYS).toEqual([
        { value: 365, label: '1年' },
        { value: 730, label: '2年' },
        { value: 1095, label: '3年' },
      ])
    })

    it('紹介割引設定が適切に設定されている', () => {
      expect(BASE_REFERRAL_DISCOUNT_AMOUNT).toBe(4000)
      expect(MAX_REFERRAL_COUNT).toBe(6)
    })
  })

  describe('ナビゲーション設定', () => {
    it('ダッシュボード項目が正しく定義されている', () => {
      expect(DASHBOARD_ITEM.name).toBe('dashboard')
      expect(DASHBOARD_ITEM.href).toBe('/dashboard')
      expect(DASHBOARD_ITEM.minRole).toBe('staff')
      expect(DASHBOARD_ITEM.minPlan).toBe('MICRO')
    })

    it('ナビゲーション項目が適切に設定されている', () => {
      expect(NAV_ITEMS).toBeDefined()
      expect(Array.isArray(NAV_ITEMS)).toBe(true)
      expect(NAV_ITEMS.length).toBeGreaterThan(0)

      // 必須項目の存在確認
      const dashboardItem = NAV_ITEMS.find((item) => item.name === 'dashboard')
      expect(dashboardItem).toBeDefined()
      expect(dashboardItem?.href).toBe('/dashboard')
    })

    it('ナビゲーショングループが適切に構成されている', () => {
      expect(NAV_GROUPS).toBeDefined()
      expect(Array.isArray(NAV_GROUPS)).toBe(true)
      expect(NAV_GROUPS.length).toBeGreaterThan(0)

      // 各グループの構造確認
      NAV_GROUPS.forEach((group) => {
        expect(group.id).toBeDefined()
        expect(group.name).toBeDefined()
        expect(Array.isArray(group.items)).toBe(true)

        // 各アイテムの構造確認
        group.items.forEach((item) => {
          expect(item.name).toBeDefined()
          expect(item.href).toBeDefined()
          expect(item.icon).toBeDefined()
          expect(item.minRole).toBeDefined()
          expect(item.minPlan).toBeDefined()
        })
      })
    })

    it('予約管理グループが正しく設定されている', () => {
      const reservationsGroup = NAV_GROUPS.find((group) => group.id === 'reservations')
      expect(reservationsGroup).toBeDefined()
      expect(reservationsGroup?.name).toBe('reservations')
      expect(reservationsGroup?.items.length).toBeGreaterThan(0)
    })

    it('スタッフ・組織グループが正しく設定されている', () => {
      const staffGroup = NAV_GROUPS.find((group) => group.id === 'staffOrganization')
      expect(staffGroup).toBeDefined()
      expect(staffGroup?.name).toBe('staffOrganization')
      expect(staffGroup?.items.length).toBeGreaterThan(0)
    })

    it('アクセス権限設定が適切である', () => {
      NAV_ITEMS.forEach((item) => {
        expect(['staff', 'manager', 'owner', 'admin']).toContain(item.minRole)
        expect(['MICRO', 'LITE', 'PRO']).toContain(item.minPlan)
      })
    })
  })

  describe('型定義', () => {
    it('NavItem型が正しく定義されている', () => {
      const testNavItem: NavItem = {
        name: 'test',
        href: '/test',
        icon: {} as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        minRole: 'staff',
        minPlan: 'LITE',
      }

      expect(testNavItem.name).toBe('test')
      expect(testNavItem.href).toBe('/test')
      expect(testNavItem.minRole).toBe('staff')
      expect(testNavItem.minPlan).toBe('LITE')
    })

    it('NavGroup型が正しく定義されている', () => {
      const testNavGroup: NavGroup = {
        id: 'test',
        name: 'test',
        items: [],
      }

      expect(testNavGroup.id).toBe('test')
      expect(testNavGroup.name).toBe('test')
      expect(Array.isArray(testNavGroup.items)).toBe(true)
    })
  })
})
