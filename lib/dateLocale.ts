// lib/dateLocale.ts
import type { Locale } from 'date-fns'

export type SupportedLocale = 'ja' | 'en' | 'th' | 'fr' | 'zh' | 'ko'

const intlLocaleCodes: Record<SupportedLocale, string> = {
  ja: 'ja-JP',
  en: 'en-US',
  th: 'th-TH',
  fr: 'fr-FR',
  zh: 'zh-CN',
  ko: 'ko-KR',
}

export function getIntlLocaleCode(code: string): string {
  return intlLocaleCodes[code as SupportedLocale] ?? intlLocaleCodes.en
}

const importers: Record<SupportedLocale, () => Promise<Locale>> = {
  ja: () => import('date-fns/locale/ja').then((m) => m.ja),
  en: () => import('date-fns/locale/en-US').then((m) => m.enUS),
  th: () => import('date-fns/locale/th').then((m) => m.th),
  fr: () => import('date-fns/locale/fr').then((m) => m.fr),
  zh: () => import('date-fns/locale/zh-CN').then((m) => m.zhCN),
  ko: () => import('date-fns/locale/ko').then((m) => m.ko),
}

// 単純キャッシュ
const cache = new Map<SupportedLocale, Locale>()

export async function getDateFnsLocale(code: SupportedLocale): Promise<Locale> {
  if (cache.has(code)) return cache.get(code)!
  const locale = await (importers[code] ?? importers.en)()
  cache.set(code, locale)
  return locale
}
