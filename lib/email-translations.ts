import ja from '@/languages/ja.json'
import en from '@/languages/en.json'
import fr from '@/languages/fr.json'
import ko from '@/languages/ko.json'
import zh from '@/languages/zh.json'
import type { SupportedLocale } from './dateLocale'

interface Translations {
  ja: typeof ja
  en: typeof en
  fr: typeof fr
  ko: typeof ko
  zh: typeof zh
}

const translations: Translations = {
  ja,
  en,
  fr,
  ko,
  zh,
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