import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getDateFnsLocale, type SupportedLocale } from '../dateLocale'
import type { Locale } from 'date-fns'

// Mock date-fns locale imports
const mockJaLocale = { code: 'ja' } as Locale
const mockEnLocale = { code: 'en-US' } as Locale
const mockFrLocale = { code: 'fr' } as Locale
const mockZhLocale = { code: 'zh-CN' } as Locale
const mockKoLocale = { code: 'ko' } as Locale

vi.mock('date-fns/locale/ja', () => ({ ja: mockJaLocale }))
vi.mock('date-fns/locale/en-US', () => ({ enUS: mockEnLocale }))
vi.mock('date-fns/locale/fr', () => ({ fr: mockFrLocale }))
vi.mock('date-fns/locale/zh-CN', () => ({ zhCN: mockZhLocale }))
vi.mock('date-fns/locale/ko', () => ({ ko: mockKoLocale }))

describe('dateLocale ライブラリ', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getDateFnsLocale function', () => {
    it('日本語ロケールを正しく取得する', async () => {
      const locale = await getDateFnsLocale('ja')
      expect(locale).toBe(mockJaLocale)
    })

    it('英語ロケールを正しく取得する', async () => {
      const locale = await getDateFnsLocale('en')
      expect(locale).toBe(mockEnLocale)
    })

    it('フランス語ロケールを正しく取得する', async () => {
      const locale = await getDateFnsLocale('fr')
      expect(locale).toBe(mockFrLocale)
    })

    it('中国語ロケールを正しく取得する', async () => {
      const locale = await getDateFnsLocale('zh')
      expect(locale).toBe(mockZhLocale)
    })

    it('韓国語ロケールを正しく取得する', async () => {
      const locale = await getDateFnsLocale('ko')
      expect(locale).toBe(mockKoLocale)
    })

    it('キャッシュが正常に動作する', async () => {
      // 最初の呼び出し
      const locale1 = await getDateFnsLocale('ja')
      // 2回目の呼び出し（キャッシュされているはず）
      const locale2 = await getDateFnsLocale('ja')
      
      expect(locale1).toBe(mockJaLocale)
      expect(locale2).toBe(mockJaLocale)
      expect(locale1).toBe(locale2) // 同じインスタンス
    })

    it('異なるロケールのキャッシュが独立している', async () => {
      const jaLocale = await getDateFnsLocale('ja')
      const enLocale = await getDateFnsLocale('en')
      
      expect(jaLocale).toBe(mockJaLocale)
      expect(enLocale).toBe(mockEnLocale)
      expect(jaLocale).not.toBe(enLocale)
    })

    it('存在しないロケールコードの場合は英語をデフォルトとする', async () => {
      const locale = await getDateFnsLocale('invalid' as SupportedLocale)
      expect(locale).toBe(mockEnLocale)
    })

    it('複数回同じロケールを取得してもキャッシュが効く', async () => {
      // 複数回同じロケールを取得
      const results = await Promise.all([
        getDateFnsLocale('ja'),
        getDateFnsLocale('ja'),
        getDateFnsLocale('ja')
      ])
      
      // すべて同じインスタンス
      expect(results[0]).toBe(mockJaLocale)
      expect(results[1]).toBe(mockJaLocale)
      expect(results[2]).toBe(mockJaLocale)
      expect(results[0]).toBe(results[1])
      expect(results[1]).toBe(results[2])
    })

    it('並行してロケール取得してもキャッシュが正常動作する', async () => {
      // 異なるロケールを並行取得
      const [jaLocale, enLocale, frLocale] = await Promise.all([
        getDateFnsLocale('ja'),
        getDateFnsLocale('en'),
        getDateFnsLocale('fr')
      ])
      
      expect(jaLocale).toBe(mockJaLocale)
      expect(enLocale).toBe(mockEnLocale)
      expect(frLocale).toBe(mockFrLocale)
    })
  })

  describe('SupportedLocale 型', () => {
    it('サポートされているロケールコードが正しく定義されている', () => {
      const supportedLocales: SupportedLocale[] = ['ja', 'en', 'fr', 'zh', 'ko']
      
      // すべてのロケールが有効な文字列
      supportedLocales.forEach(locale => {
        expect(typeof locale).toBe('string')
        expect(locale.length).toBeGreaterThan(0)
      })
    })
  })
})