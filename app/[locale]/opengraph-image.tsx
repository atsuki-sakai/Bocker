import { createBockerOgImage } from '@/lib/bockerOgImage'
import { DEFAULT_LOCALE, isAppLocale } from '@/i18n/config'

export const runtime = 'edge'
export const alt = 'Bocker booking management system'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params

  return createBockerOgImage(isAppLocale(locale) ? locale : DEFAULT_LOCALE)
}
