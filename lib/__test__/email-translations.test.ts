import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SupportedLocale } from '../dateLocale'

// Mock language files with proper module structure - must be at top level
vi.mock('@/languages/ja.json', () => ({
  default: {
    emails: {
      customerRegistration: {
        subject: '【テスト】会員登録完了',
        greeting: 'こんにちは',
      },
      reservationConfirmation: {
        subject: '【テスト】ご予約内容の確認',
        greeting: 'いつもありがとうございます',
      },
      passwordChanged: {
        subject: '【テスト】パスワード変更完了',
        greeting: 'こんにちは',
      },
      passwordReset: {
        subject: '【テスト】パスワードリセット',
        greeting: 'こんにちは',
      },
    },
  },
}))

vi.mock('@/languages/en.json', () => ({
  default: {
    emails: {
      customerRegistration: {
        subject: '[Test] Registration Complete',
        greeting: 'Hello',
      },
      reservationConfirmation: {
        subject: '[Test] Reservation Confirmation',
        greeting: 'Thank you',
      },
      passwordChanged: {
        subject: '[Test] Password Changed',
        greeting: 'Hello',
      },
      passwordReset: {
        subject: '[Test] Password Reset',
        greeting: 'Hello',
      },
    },
  },
}))

vi.mock('@/languages/fr.json', () => ({
  default: {
    emails: {
      customerRegistration: {
        subject: '[Test] Inscription terminée',
        greeting: 'Bonjour',
      },
      reservationConfirmation: {
        subject: '[Test] Confirmation de réservation',
        greeting: 'Merci',
      },
      passwordChanged: {
        subject: '[Test] Mot de passe modifié',
        greeting: 'Bonjour',
      },
      passwordReset: {
        subject: '[Test] Réinitialisation du mot de passe',
        greeting: 'Bonjour',
      },
    },
  },
}))

vi.mock('@/languages/ko.json', () => ({
  default: {
    emails: {
      customerRegistration: {
        subject: '[테스트] 회원 가입 완료',
        greeting: '안녕하세요',
      },
      reservationConfirmation: {
        subject: '[테스트] 예약 확인',
        greeting: '감사합니다',
      },
      passwordChanged: {
        subject: '[테스트] 비밀번호 변경 완료',
        greeting: '안녕하세요',
      },
      passwordReset: {
        subject: '[테스트] 비밀번호 재설정',
        greeting: '안녕하세요',
      },
    },
  },
}))

vi.mock('@/languages/zh.json', () => ({
  default: {
    emails: {
      customerRegistration: {
        subject: '[测试] 注册完成',
        greeting: '您好',
      },
      reservationConfirmation: {
        subject: '[测试] 预订确认',
        greeting: '谢谢',
      },
      passwordChanged: {
        subject: '[测试] 密码已更改',
        greeting: '您好',
      },
      passwordReset: {
        subject: '[测试] 密码重置',
        greeting: '您好',
      },
    },
  },
}))

vi.mock('@/languages/th.json', () => ({
  default: {
    emails: {
      customerRegistration: {
        subject: '[ทดสอบ] ลงทะเบียนสำเร็จ',
        greeting: 'สวัสดี',
      },
      reservationConfirmation: {
        subject: '[ทดสอบ] ยืนยันการจอง',
        greeting: 'ขอบคุณ',
      },
      passwordChanged: {
        subject: '[ทดสอบ] เปลี่ยนรหัสผ่านแล้ว',
        greeting: 'สวัสดี',
      },
      passwordReset: {
        subject: '[ทดสอบ] รีเซ็ตรหัสผ่าน',
        greeting: 'สวัสดี',
      },
    },
  },
}))

// Import after mocks are defined
import { getEmailTranslations, getEmailTemplateTranslations } from '../email-translations'

// Expected mock data for assertions
const mockJaTranslations = {
  emails: {
    customerRegistration: {
      subject: '【テスト】会員登録完了',
      greeting: 'こんにちは',
    },
    reservationConfirmation: {
      subject: '【テスト】ご予約内容の確認',
      greeting: 'いつもありがとうございます',
    },
    passwordChanged: {
      subject: '【テスト】パスワード変更完了',
      greeting: 'こんにちは',
    },
    passwordReset: {
      subject: '【テスト】パスワードリセット',
      greeting: 'こんにちは',
    },
  },
}

const mockEnTranslations = {
  emails: {
    customerRegistration: {
      subject: '[Test] Registration Complete',
      greeting: 'Hello',
    },
    reservationConfirmation: {
      subject: '[Test] Reservation Confirmation',
      greeting: 'Thank you',
    },
    passwordChanged: {
      subject: '[Test] Password Changed',
      greeting: 'Hello',
    },
    passwordReset: {
      subject: '[Test] Password Reset',
      greeting: 'Hello',
    },
  },
}

const mockFrTranslations = {
  emails: {
    customerRegistration: {
      subject: '[Test] Inscription terminée',
      greeting: 'Bonjour',
    },
    reservationConfirmation: {
      subject: '[Test] Confirmation de réservation',
      greeting: 'Merci',
    },
    passwordChanged: {
      subject: '[Test] Mot de passe modifié',
      greeting: 'Bonjour',
    },
    passwordReset: {
      subject: '[Test] Réinitialisation du mot de passe',
      greeting: 'Bonjour',
    },
  },
}

const mockKoTranslations = {
  emails: {
    customerRegistration: {
      subject: '[테스트] 회원 가입 완료',
      greeting: '안녕하세요',
    },
    reservationConfirmation: {
      subject: '[테스트] 예약 확인',
      greeting: '감사합니다',
    },
    passwordChanged: {
      subject: '[테스트] 비밀번호 변경 완료',
      greeting: '안녕하세요',
    },
    passwordReset: {
      subject: '[테스트] 비밀번호 재설정',
      greeting: '안녕하세요',
    },
  },
}

const mockZhTranslations = {
  emails: {
    customerRegistration: {
      subject: '[测试] 注册完成',
      greeting: '您好',
    },
    reservationConfirmation: {
      subject: '[测试] 预订确认',
      greeting: '谢谢',
    },
    passwordChanged: {
      subject: '[测试] 密码已更改',
      greeting: '您好',
    },
    passwordReset: {
      subject: '[测试] 密码重置',
      greeting: '您好',
    },
  },
}

const mockThTranslations = {
  emails: {
    customerRegistration: {
      subject: '[ทดสอบ] ลงทะเบียนสำเร็จ',
      greeting: 'สวัสดี',
    },
    reservationConfirmation: {
      subject: '[ทดสอบ] ยืนยันการจอง',
      greeting: 'ขอบคุณ',
    },
    passwordChanged: {
      subject: '[ทดสอบ] เปลี่ยนรหัสผ่านแล้ว',
      greeting: 'สวัสดี',
    },
    passwordReset: {
      subject: '[ทดสอบ] รีเซ็ตรหัสผ่าน',
      greeting: 'สวัสดี',
    },
  },
}

describe('email-translations ライブラリ', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getEmailTranslations function', () => {
    it('日本語のメール翻訳を取得する', () => {
      const translations = getEmailTranslations('ja')
      expect(translations).toEqual(mockJaTranslations.emails)
    })

    it('英語のメール翻訳を取得する', () => {
      const translations = getEmailTranslations('en')
      expect(translations).toEqual(mockEnTranslations.emails)
    })

    it('フランス語のメール翻訳を取得する', () => {
      const translations = getEmailTranslations('fr')
      expect(translations).toEqual(mockFrTranslations.emails)
    })

    it('韓国語のメール翻訳を取得する', () => {
      const translations = getEmailTranslations('ko')
      expect(translations).toEqual(mockKoTranslations.emails)
    })

    it('中国語のメール翻訳を取得する', () => {
      const translations = getEmailTranslations('zh')
      expect(translations).toEqual(mockZhTranslations.emails)
    })

    it('タイ語のメール翻訳を取得する', () => {
      const translations = getEmailTranslations('th')
      expect(translations).toEqual(mockThTranslations.emails)
    })

    it('ロケール未指定時はデフォルトで日本語を返す', () => {
      const translations = getEmailTranslations()
      expect(translations).toEqual(mockJaTranslations.emails)
    })

    it('予約確認メールテンプレートが存在する', () => {
      const translations = getEmailTranslations('ja')
      expect(translations.reservationConfirmation).toBeDefined()
      expect(translations.reservationConfirmation.subject).toBe('【テスト】ご予約内容の確認')
      expect(translations.reservationConfirmation.greeting).toBe('いつもありがとうございます')
    })

    it('会員登録メールテンプレートが存在する', () => {
      const translations = getEmailTranslations('ja')
      expect(translations.customerRegistration).toBeDefined()
      expect(translations.customerRegistration.subject).toBe('【テスト】会員登録完了')
      expect(translations.customerRegistration.greeting).toBe('こんにちは')
    })
  })

  describe('getEmailTemplateTranslations function', () => {
    it('特定のテンプレートの日本語翻訳を取得する', () => {
      const reservationTranslations = getEmailTemplateTranslations('reservationConfirmation', 'ja')
      expect(reservationTranslations).toEqual(mockJaTranslations.emails.reservationConfirmation)
    })

    it('特定のテンプレートの英語翻訳を取得する', () => {
      const reservationTranslations = getEmailTemplateTranslations('reservationConfirmation', 'en')
      expect(reservationTranslations).toEqual(mockEnTranslations.emails.reservationConfirmation)
    })

    it('会員登録テンプレートの翻訳を取得する', () => {
      const customerRegistrationTranslations = getEmailTemplateTranslations(
        'customerRegistration',
        'ja'
      )
      expect(customerRegistrationTranslations).toEqual(
        mockJaTranslations.emails.customerRegistration
      )
    })

    it('ロケール未指定時はデフォルトで日本語を返す', () => {
      const reservationTranslations = getEmailTemplateTranslations('reservationConfirmation')
      expect(reservationTranslations).toEqual(mockJaTranslations.emails.reservationConfirmation)
    })

    it('複数の言語で同じテンプレートを取得できる', () => {
      const jaReservation = getEmailTemplateTranslations('reservationConfirmation', 'ja')
      const enReservation = getEmailTemplateTranslations('reservationConfirmation', 'en')
      const frReservation = getEmailTemplateTranslations('reservationConfirmation', 'fr')

      expect(jaReservation.subject).toBe('【テスト】ご予約内容の確認')
      expect(enReservation.subject).toBe('[Test] Reservation Confirmation')
      expect(frReservation.subject).toBe('[Test] Confirmation de réservation')
    })

    it('美容サロン業界特有のメール内容が適切に翻訳されている', () => {
      // 予約確認メールの内容確認
      const jaReservation = getEmailTemplateTranslations('reservationConfirmation', 'ja')
      const enReservation = getEmailTemplateTranslations('reservationConfirmation', 'en')

      // 日本語版は丁寧語を使用
      expect(jaReservation.greeting).toBe('いつもありがとうございます')
      expect(jaReservation.subject).toBe('【テスト】ご予約内容の確認')

      // 英語版は適切な敬語表現
      expect(enReservation.greeting).toBe('Thank you')
      expect(enReservation.subject).toBe('[Test] Reservation Confirmation')
    })
  })

  describe('多言語対応の整合性', () => {
    it('すべてのサポート言語で同じテンプレート構造を持つ', () => {
      const supportedLocales: SupportedLocale[] = ['ja', 'en', 'th', 'fr', 'ko', 'zh']

      supportedLocales.forEach((locale) => {
        const translations = getEmailTranslations(locale)

        // 必須テンプレートの存在確認
        expect(translations.reservationConfirmation).toBeDefined()
        expect(translations.customerRegistration).toBeDefined()
        expect(translations.passwordChanged).toBeDefined()
        expect(translations.passwordReset).toBeDefined()

        // 各テンプレートの必須フィールド確認
        expect(translations.reservationConfirmation.subject).toBeDefined()
        expect(translations.reservationConfirmation.greeting).toBeDefined()
        expect(translations.customerRegistration.subject).toBeDefined()
        expect(translations.customerRegistration.greeting).toBeDefined()
      })
    })

    it('テンプレートキーが全言語で一致している', () => {
      const baseKeys = Object.keys(getEmailTranslations('ja'))
      const supportedLocales: SupportedLocale[] = ['en', 'th', 'fr', 'ko', 'zh']

      supportedLocales.forEach((locale) => {
        const localeKeys = Object.keys(getEmailTranslations(locale))
        expect(localeKeys).toEqual(baseKeys)
      })
    })

    it('各テンプレート内のフィールドキーが全言語で一致している', () => {
      const supportedLocales: SupportedLocale[] = ['ja', 'en', 'th', 'fr', 'ko', 'zh']
      const templateKeys = [
        'reservationConfirmation',
        'customerRegistration',
        'passwordChanged',
        'passwordReset',
      ] as const

      templateKeys.forEach((templateKey) => {
        const baseFields = Object.keys(getEmailTemplateTranslations(templateKey, 'ja'))

        supportedLocales.slice(1).forEach((locale) => {
          const localeFields = Object.keys(getEmailTemplateTranslations(templateKey, locale))
          expect(localeFields).toEqual(baseFields)
        })
      })
    })
  })

  describe('サーバーサイド利用の想定', () => {
    it('Reactフックが不要な環境で利用できる', () => {
      // この関数はサーバーサイドでの利用を想定しているため、
      // React hooksに依存しない設計であることを確認
      expect(() => {
        getEmailTranslations('ja')
        getEmailTemplateTranslations('reservationConfirmation', 'ja')
      }).not.toThrow()
    })

    it('メール送信に必要な情報が含まれている', () => {
      const reservationEmail = getEmailTemplateTranslations('reservationConfirmation', 'ja')

      // メール送信に必要な基本情報
      expect(reservationEmail.subject).toBeDefined()
      expect(reservationEmail.greeting).toBeDefined()

      // 文字列として取得できる
      expect(typeof reservationEmail.subject).toBe('string')
      expect(typeof reservationEmail.greeting).toBe('string')
    })
  })
})
