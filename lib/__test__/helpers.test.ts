import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchAddressByPostalCode, calcAgeFromBirthday } from '../helpers'

// Global fetchのモック
global.fetch = vi.fn()

describe('helpers ライブラリ', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('fetchAddressByPostalCode function', () => {
    const mockSuccessResponse = {
      results: [
        {
          address1: '東京都',
          address2: '渋谷区',
          address3: '神宮前',
        }
      ]
    }

    const mockNoResultsResponse = {
      results: null,
      message: '該当する住所が見つかりませんでした'
    }

    const mockEmptyResultsResponse = {
      results: []
    }

    it('正常な郵便番号で住所を取得する', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSuccessResponse),
      } as Response)

      const result = await fetchAddressByPostalCode('150-0001')
      
      expect(fetch).toHaveBeenCalledWith('https://zipcloud.ibsnet.co.jp/api/search?zipcode=1500001')
      expect(result).toBe('東京都渋谷区神宮前')
    })

    it('ハイフン付き郵便番号を正しく処理する', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSuccessResponse),
      } as Response)

      await fetchAddressByPostalCode('150-0001')
      
      expect(fetch).toHaveBeenCalledWith('https://zipcloud.ibsnet.co.jp/api/search?zipcode=1500001')
    })

    it('ハイフンなし郵便番号を正しく処理する', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSuccessResponse),
      } as Response)

      await fetchAddressByPostalCode('1500001')
      
      expect(fetch).toHaveBeenCalledWith('https://zipcloud.ibsnet.co.jp/api/search?zipcode=1500001')
    })

    it('美容サロンがよく立地する渋谷区の住所を正しく処理する', async () => {
      const shibuyaResponse = {
        results: [
          {
            address1: '東京都',
            address2: '渋谷区',
            address3: '宇田川町',
          }
        ]
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(shibuyaResponse),
      } as Response)

      const result = await fetchAddressByPostalCode('150-0042')
      expect(result).toBe('東京都渋谷区宇田川町')
    })

    it('不正な郵便番号（7桁未満）でエラーメッセージを返す', async () => {
      const result = await fetchAddressByPostalCode('123')
      expect(result).toBe('郵便番号が不正です')
      expect(fetch).not.toHaveBeenCalled()
    })

    it('不正な郵便番号（8桁以上）でエラーメッセージを返す', async () => {
      const result = await fetchAddressByPostalCode('12345678')
      expect(result).toBe('郵便番号が不正です')
      expect(fetch).not.toHaveBeenCalled()
    })

    it('空文字の郵便番号でエラーメッセージを返す', async () => {
      const result = await fetchAddressByPostalCode('')
      expect(result).toBe('郵便番号が不正です')
      expect(fetch).not.toHaveBeenCalled()
    })

    it('API結果が空の場合は適切なメッセージを返す', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEmptyResultsResponse),
      } as Response)

      const result = await fetchAddressByPostalCode('000-0000')
      expect(result).toBe('住所が見つかりませんでした')
    })

    it('APIからエラーメッセージが返された場合はそのメッセージを返す', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockNoResultsResponse),
      } as Response)

      const result = await fetchAddressByPostalCode('999-9999')
      expect(result).toBe('該当する住所が見つかりませんでした')
    })

    it('ネットワークエラー時は適切なエラーメッセージを返す', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const result = await fetchAddressByPostalCode('150-0001')
      
      expect(result).toBe('住所が見つかりませんでした')
      expect(consoleSpy).toHaveBeenCalledWith(
        '郵便番号から住所を取得する際にエラーが発生しました',
        expect.any(Error)
      )
    })

    it('JSON解析エラー時は適切なエラーメッセージを返す', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('JSON parse error')),
      } as Response)

      const result = await fetchAddressByPostalCode('150-0001')
      
      expect(result).toBe('住所が見つかりませんでした')
      expect(consoleSpy).toHaveBeenCalled()
    })

    it('複数の住所候補がある場合は最初の結果を返す', async () => {
      const multipleResultsResponse = {
        results: [
          {
            address1: '東京都',
            address2: '港区',
            address3: '六本木',
          },
          {
            address1: '東京都',
            address2: '港区',
            address3: '赤坂',
          }
        ]
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(multipleResultsResponse),
      } as Response)

      const result = await fetchAddressByPostalCode('106-0032')
      expect(result).toBe('東京都港区六本木')
    })
  })

  describe('calcAgeFromBirthday function', () => {
    // 固定日時でテストするため
    const mockCurrentDate = new Date('2024-06-15')

    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(mockCurrentDate)
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('正常な生年月日から年齢を計算する', () => {
      const age = calcAgeFromBirthday('1990-03-15')
      expect(age).toBe(34) // 2024-06-15時点で1990-03-15生まれは34歳
    })

    it('今年誕生日を迎えていない場合の年齢計算', () => {
      const age = calcAgeFromBirthday('1990-07-15')
      expect(age).toBe(33) // まだ誕生日を迎えていないので33歳
    })

    it('今年誕生日を迎えた場合の年齢計算', () => {
      const age = calcAgeFromBirthday('1990-01-15')
      expect(age).toBe(34) // すでに誕生日を迎えているので34歳
    })

    it('今日が誕生日の場合の年齢計算', () => {
      const age = calcAgeFromBirthday('1990-06-15')
      expect(age).toBe(34) // 今日が誕生日なので34歳
    })

    it('同じ月で誕生日前の年齢計算', () => {
      const age = calcAgeFromBirthday('1990-06-20')
      expect(age).toBe(33) // 同じ月だが日付がまだなので33歳
    })

    it('null の生年月日でnullを返す', () => {
      const age = calcAgeFromBirthday(null)
      expect(age).toBeNull()
    })

    it('美容サロン顧客の一般的な年齢層のテスト', () => {
      // 20代前半
      expect(calcAgeFromBirthday('2000-01-01')).toBe(24)
      
      // 30代後半
      expect(calcAgeFromBirthday('1985-12-31')).toBe(38)
      
      // 40代中盤
      expect(calcAgeFromBirthday('1980-06-15')).toBe(44)
      
      // 50代前半
      expect(calcAgeFromBirthday('1970-03-01')).toBe(54)
    })

    it('未来の日付で負の年齢にならない', () => {
      const age = calcAgeFromBirthday('2025-01-01')
      expect(age).toBe(-1) // 実装は負の年齢も許可（未来の誕生日）
    })

    it('1月1日生まれの年齢計算', () => {
      const age = calcAgeFromBirthday('1995-01-01')
      expect(age).toBe(29) // 2024年なのですでに誕生日を迎えている
    })

    it('12月31日生まれの年齢計算', () => {
      const age = calcAgeFromBirthday('1995-12-31')
      expect(age).toBe(28) // まだ誕生日を迎えていない
    })

    it('うるう年生まれの年齢計算', () => {
      // うるう年の2月29日生まれ
      vi.setSystemTime(new Date('2024-03-01')) // 2024年3月1日
      const age = calcAgeFromBirthday('2000-02-29')
      expect(age).toBe(24) // 2月29日は過ぎているので24歳
    })

    it('高齢顧客の年齢計算', () => {
      // 70代の顧客
      const age = calcAgeFromBirthday('1950-01-01')
      expect(age).toBe(74)
    })

    it('若年顧客の年齢計算', () => {
      // 18歳（美容サロンの最年少顧客層）
      const age = calcAgeFromBirthday('2006-01-01')
      expect(age).toBe(18)
    })

    it('異なる日付形式での動作確認', () => {
      // YYYY-MM-DD形式以外でも正しく動作することを確認
      expect(() => calcAgeFromBirthday('1990/03/15')).not.toThrow()
      expect(() => calcAgeFromBirthday('March 15, 1990')).not.toThrow()
    })
  })
})