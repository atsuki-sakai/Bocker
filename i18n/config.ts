export const SUPPORTED_LOCALES = ['ja', 'en', 'th'] as const

export type AppLocale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: AppLocale = 'ja'

export const LOCALE_METADATA: Record<
  AppLocale,
  { htmlLang: string; openGraphLocale: string; speechRecognitionLang: string }
> = {
  ja: { htmlLang: 'ja-JP', openGraphLocale: 'ja_JP', speechRecognitionLang: 'ja-JP' },
  en: { htmlLang: 'en-US', openGraphLocale: 'en_US', speechRecognitionLang: 'en-US' },
  th: { htmlLang: 'th-TH', openGraphLocale: 'th_TH', speechRecognitionLang: 'th-TH' },
}

export function isAppLocale(locale: string): locale is AppLocale {
  return SUPPORTED_LOCALES.includes(locale as AppLocale)
}

export function getLocaleMetadata(locale: string) {
  return LOCALE_METADATA[isAppLocale(locale) ? locale : DEFAULT_LOCALE]
}
