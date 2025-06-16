import ja from '@/languages/ja.json'
import en from '@/languages/en.json'

export type SupportedLocale = 'ja' | 'en'

interface Translations {
  ja: typeof ja
  en: typeof en
}

const translations: Translations = {
  ja,
  en,
}

/**
 * Get email translations for a specific locale
 * This is used for server-side email rendering where React hooks are not available
 */
export function getEmailTranslations(locale: SupportedLocale = 'ja') {
  return translations[locale].emails
}

/**
 * Get a specific email template translations
 */
export function getEmailTemplateTranslations<
  T extends keyof typeof ja.emails
>(template: T, locale: SupportedLocale = 'ja') {
  return translations[locale].emails[template]
}