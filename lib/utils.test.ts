import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  cn,
  checkAllowedUrl,
  retryOperation,
  normalizeSubscriptionStatus,
  generatePinCode,
  priceIdToPlanInfo,
  fileToBase64,
  createSingleImageFormData,
  createMultipleImageFormData,
  generateRandomHex,
  encryptStringCryptoJS,
  decryptStringCryptoJS,
  setCookie,
  getCookie,
  deleteCookie,
  sanitizeFileName,
  hasAccess,
} from './utils'
import { SystemError } from '@/lib/errors/custom_errors'
import type Stripe from 'stripe'

// 環境変数のモック
vi.mock('@/lib/env-config', () => ({
  getEnv: vi.fn((key: string) => {
    const mockEnvs: Record<string, string> = {
      NEXT_PUBLIC_APP_COOKIE_SECRET: 'test-secret-key',
      NODE_ENV: 'test',
      NEXT_PUBLIC_LITE_MONTHLY_PRC_ID: 'price_lite_monthly',
      NEXT_PUBLIC_LITE_YEARLY_PRC_ID: 'price_lite_yearly',
      NEXT_PUBLIC_PRO_MONTHLY_PRC_ID: 'price_pro_monthly',
      NEXT_PUBLIC_PRO_YEARLY_PRC_ID: 'price_pro_yearly',
    }
    return mockEnvs[key] || ''
  }),
}))

// 定数のモック
vi.mock('@/lib/constants', () => ({
  ALLOWED_DOMAINS: ['localhost', 'example.com', 'test.com'],
  PLAN_MONTHLY_PRICES: { LITE: 1000, PRO: 3000 },
  PLAN_YEARLY_PRICES: {
    LITE: { price: 10000 },
    PRO: { price: 30000 },
  },
}))

vi.mock('@/convex/constants', () => ({
  MAX_PIN_CODE_LENGTH: 6,
}))

vi.mock('@/lib/types', () => ({
  ROLE_LEVEL: { OWNER: 3, ADMIN: 2, STAFF: 1 },
  PLAN_LEVEL: { PRO: 2, LITE: 1, UNKNOWN: 0 },
}))

// グローバルオブジェクトのモック
const mockCrypto = {
  getRandomValues: vi.fn((array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
    return array
  }),
}

Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
})

// FileReaderのモック
class MockFileReader {
  result: string | null = null
  onloadend: (() => void) | null = null
  onerror: ((error: any) => void) | null = null

  readAsDataURL(file: File) {
    setTimeout(() => {
      this.result = `data:image/jpeg;base64,${btoa('mock-file-content')}`
      this.onloadend?.()
    }, 0)
  }
}

Object.defineProperty(global, 'FileReader', {
  value: MockFileReader,
  writable: true,
})

describe('Utils Library', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('cn function', () => {
    it('基本的なクラス名の結合ができる', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2')
    })

    it('条件付きクラスの適用ができる', () => {
      expect(cn('base', true && 'conditional', false && 'hidden')).toBe('base conditional')
    })

    it('重複クラスが除去される', () => {
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
    })

    it('空値が適切に処理される', () => {
      expect(cn('class1', null, undefined, '', 'class2')).toBe('class1 class2')
    })

    it('配列形式のクラス名が処理される', () => {
      expect(cn(['class1', 'class2'], 'class3')).toBe('class1 class2 class3')
    })
  })

  describe('checkAllowedUrl function', () => {
    it('許可されたドメインのURLが通る', () => {
      expect(() => checkAllowedUrl('https://example.com/path')).not.toThrow()
    })

    it('許可されていないドメインでSystemErrorがスローされる', () => {
      expect(() => checkAllowedUrl('https://malicious.com/path')).toThrow(SystemError)
    })

    it('無効なURL形式でSystemErrorがスローされる', () => {
      expect(() => checkAllowedUrl('invalid-url')).toThrow(SystemError)
    })

    it('localhostが許可される', () => {
      expect(() => checkAllowedUrl('http://localhost:3000/path')).not.toThrow()
    })
  })

  describe('retryOperation function', () => {
    it('成功時は即座に結果を返す', async () => {
      const operation = vi.fn().mockResolvedValue('success')
      const result = await retryOperation(operation)

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('失敗時に指定回数リトライする', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail1'))
        .mockRejectedValueOnce(new Error('fail2'))
        .mockResolvedValue('success')

      const result = await retryOperation(operation, { maxRetries: 3 })

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(3)
    })

    it('最大リトライ回数に達したらエラーをスローする', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('persistent error'))

      await expect(retryOperation(operation, { maxRetries: 2 })).rejects.toThrow('persistent error')
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('shouldRetryコールバックでリトライを制御できる', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('no retry'))
      const shouldRetry = vi.fn().mockReturnValue(false)

      await expect(retryOperation(operation, { shouldRetry })).rejects.toThrow('no retry')
      expect(operation).toHaveBeenCalledTimes(1)
      expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error), 1)
    })

    it('AbortSignalで中断できる', async () => {
      const controller = new AbortController()
      const operation = vi.fn().mockRejectedValue(new Error('fail'))

      controller.abort()

      await expect(retryOperation(operation, { signal: controller.signal })).rejects.toThrow(
        'retryOperation: aborted by signal'
      )
    })

    it('onRetryコールバックが呼ばれる', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success')
      const onRetry = vi.fn()

      await retryOperation(operation, { onRetry })

      expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1, expect.any(Number))
    })
  })

  describe('normalizeSubscriptionStatus function', () => {
    it('incompleteステータスをactiveに正規化する', () => {
      const subscription = { status: 'incomplete' } as Stripe.Subscription
      expect(normalizeSubscriptionStatus(subscription)).toBe('active')
    })

    it('trialingステータスをactiveに正規化する', () => {
      const subscription = { status: 'trialing' } as Stripe.Subscription
      expect(normalizeSubscriptionStatus(subscription)).toBe('active')
    })

    it('activeステータスはそのまま返す', () => {
      const subscription = { status: 'active' } as Stripe.Subscription
      expect(normalizeSubscriptionStatus(subscription)).toBe('active')
    })

    it('past_dueステータスはそのまま返す', () => {
      const subscription = { status: 'past_due' } as Stripe.Subscription
      expect(normalizeSubscriptionStatus(subscription)).toBe('past_due')
    })

    it('未知のステータスはそのまま返し警告を出力する', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const subscription = { id: 'sub_123', status: 'unknown_status' } as any

      expect(normalizeSubscriptionStatus(subscription)).toBe('unknown_status')
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('未知のサブスクリプションステータス: unknown_status')
      )
    })
  })

  describe('generatePinCode function', () => {
    it('指定された長さのPINコードを生成する', () => {
      const pinCode = generatePinCode()
      expect(pinCode).toHaveLength(6)
    })

    it('大文字、小文字、数字が含まれる', () => {
      const pinCode = generatePinCode()
      expect(pinCode).toMatch(/[A-Z]/)
      expect(pinCode).toMatch(/[a-z]/)
      expect(pinCode).toMatch(/[0-9]/)
    })

    it('複数回実行で異なる値が生成される', () => {
      const pin1 = generatePinCode()
      const pin2 = generatePinCode()
      expect(pin1).not.toBe(pin2)
    })
  })

  describe('priceIdToPlanInfo function', () => {
    it('LITEの月額プランを正しく変換する', () => {
      const result = priceIdToPlanInfo('price_lite_monthly')
      expect(result).toEqual({
        name: 'LITE',
        price: 1000,
        billing_period: 'month',
      })
    })

    it('PROの年額プランを正しく変換する', () => {
      const result = priceIdToPlanInfo('price_pro_yearly')
      expect(result).toEqual({
        name: 'PRO',
        price: 30000,
        billing_period: 'year',
      })
    })

    it('未知のpriceIdでデフォルト値を返す', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const result = priceIdToPlanInfo('unknown_price_id')

      expect(result).toEqual({
        name: 'UNKNOWN',
        price: 0,
        billing_period: 'month',
      })
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown priceId: unknown_price_id')
      )
    })
  })

  describe('fileToBase64 function', () => {
    it('ファイルをBase64に変換する', async () => {
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' })
      const result = await fileToBase64(mockFile)

      expect(result).toBe(btoa('mock-file-content'))
    })

    it('サーバー環境でエラーをスローする', async () => {
      // windowを一時的に削除
      const originalWindow = global.window
      delete (global as any).window

      const mockFile = new File(['test'], 'test.txt')

      await expect(fileToBase64(mockFile)).rejects.toThrow(
        'fileToBase64 can only be used in a browser environment.'
      )

      // windowを復元
      global.window = originalWindow
    })
  })

  describe('createSingleImageFormData function', () => {
    it('単一画像用のFormDataを作成する', () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const formData = createSingleImageFormData(file, 'org123', 'uploads', {
        quality: 'high',
        aspectType: '16:9',
      })

      expect(formData.get('file')).toBe(file)
      expect(formData.get('orgId')).toBe('org123')
      expect(formData.get('directory')).toBe('uploads')
      expect(formData.get('quality')).toBe('high')
      expect(formData.get('aspectType')).toBe('16:9')
    })

    it('オプションなしでFormDataを作成する', () => {
      const file = new File(['test'], 'test.jpg')
      const formData = createSingleImageFormData(file, 'org123', 'uploads')

      expect(formData.get('quality')).toBeNull()
      expect(formData.get('aspectType')).toBeNull()
    })
  })

  describe('createMultipleImageFormData function', () => {
    it('複数画像用のFormDataを作成する', () => {
      const files = [new File(['test1'], 'test1.jpg'), new File(['test2'], 'test2.jpg')]
      const formData = createMultipleImageFormData(files, 'org123', 'uploads')

      expect(formData.getAll('files[]')).toHaveLength(2)
      expect(formData.get('orgId')).toBe('org123')
      expect(formData.get('directory')).toBe('uploads')
    })
  })

  describe('generateRandomHex function', () => {
    it('指定されたバイト長の16進数文字列を生成する', () => {
      const hex = generateRandomHex(16)
      expect(hex).toHaveLength(32) // 16バイト = 32文字
      expect(hex).toMatch(/^[0-9a-f]+$/)
    })

    it('デフォルトで32バイトの16進数文字列を生成する', () => {
      const hex = generateRandomHex()
      expect(hex).toHaveLength(64) // 32バイト = 64文字
    })
  })

  describe('encryptStringCryptoJS and decryptStringCryptoJS functions', () => {
    it('文字列の暗号化と復号化ができる', () => {
      const originalText = 'Hello, World!'
      const encrypted = encryptStringCryptoJS(originalText)
      const decrypted = decryptStringCryptoJS(encrypted)

      expect(encrypted).not.toBe(originalText)
      expect(decrypted).toBe(originalText)
    })

    it('無効な暗号化データの復号化でnullを返す', () => {
      const result = decryptStringCryptoJS('invalid-encrypted-data')
      expect(result).toBeNull()
    })
  })

  describe('sanitizeFileName function', () => {
    it('基本的なファイル名はそのまま通す', () => {
      expect(sanitizeFileName('document.pdf')).toBe('document.pdf')
    })

    it('絵文字を除去する', () => {
      expect(sanitizeFileName('file😀.txt')).toBe('file.txt')
    })

    it('危険な文字を_に置換する', () => {
      expect(sanitizeFileName('file/name?.txt')).toBe('file_name_.txt')
    })

    it('Path Traversal攻撃を防ぐ', () => {
      expect(sanitizeFileName('../../../etc/passwd')).toBe('___etc_passwd')
    })

    it('空文字列の場合はfileを返す', () => {
      expect(sanitizeFileName('')).toBe('file')
    })

    it('255文字制限を適用する', () => {
      const longName = 'a'.repeat(300) + '.txt'
      const result = sanitizeFileName(longName)
      expect(new TextEncoder().encode(result).length).toBeLessThanOrEqual(255)
    })

    it('非文字列入力でTypeErrorをスローする', () => {
      expect(() => sanitizeFileName(null as any)).toThrow(TypeError)
    })
  })

  describe('hasAccess function', () => {
    it('十分な権限がある場合はtrueを返す', () => {
      expect(hasAccess('ADMIN', 'PRO', 'STAFF', 'LITE')).toBe(true)
    })

    it('ロール権限が不足している場合はfalseを返す', () => {
      expect(hasAccess('STAFF', 'PRO', 'ADMIN', 'LITE')).toBe(false)
    })

    it('プラン権限が不足している場合はfalseを返す', () => {
      expect(hasAccess('ADMIN', 'LITE', 'STAFF', 'PRO')).toBe(false)
    })

    it('両方の権限が不足している場合はfalseを返す', () => {
      expect(hasAccess('STAFF', 'LITE', 'ADMIN', 'PRO')).toBe(false)
    })
  })

  describe('Cookie functions', () => {
    let mockDocument: unknown

    beforeEach(() => {
      mockDocument = {
        cookie: '',
      }
      Object.defineProperty(global, 'document', {
        value: mockDocument,
        writable: true,
      })
    })

    it('setCookieでクッキーを設定できる', () => {
      setCookie('testCookie', 'testValue', 7)
      expect(mockDocument.cookie).toContain('testCookie=')
    })

    it('getCookieでクッキーを取得できる', () => {
      mockDocument.cookie = 'testCookie=testValue; path=/'
      const result = getCookie('testCookie')
      expect(result).toBe('testValue')
    })

    it('存在しないクッキーでnullを返す', () => {
      mockDocument.cookie = 'otherCookie=value'
      const result = getCookie('nonExistentCookie')
      expect(result).toBeNull()
    })

    it('deleteCookieでクッキーを削除できる', () => {
      deleteCookie('testCookie')
      expect(mockDocument.cookie).toContain('expires=Thu, 01 Jan 1970')
    })
  })
})
