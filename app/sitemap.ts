import type { MetadataRoute } from 'next'
import { LOCALE_METADATA, SUPPORTED_LOCALES, type AppLocale } from '@/i18n/config'

const pages = [
  { path: '', changeFrequency: 'daily', priority: 1 },
  { path: '/sign-up', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/sign-in', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/features', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/pricing', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/faq', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.5 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.5 },
] as const

function localizedUrl(baseUrl: string, locale: AppLocale, path: string) {
  return `${baseUrl}/${locale}${path}`
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://bocker.jp'
  const lastModified = new Date()

  return pages.flatMap(({ path, changeFrequency, priority }) => {
    const languages = Object.fromEntries(
      SUPPORTED_LOCALES.map((locale) => [
        LOCALE_METADATA[locale].htmlLang,
        localizedUrl(baseUrl, locale, path),
      ])
    )

    return SUPPORTED_LOCALES.map((locale) => ({
      url: localizedUrl(baseUrl, locale, path),
      lastModified,
      changeFrequency,
      priority: locale === 'ja' ? priority : Math.max(priority - 0.1, 0.1),
      alternates: { languages },
    }))
  })
}
