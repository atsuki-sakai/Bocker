import type { Metadata } from 'next'
// global styles are imported in the root layout to avoid duplication
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { notFound } from 'next/navigation'
import ClientLayout from './ClientLayout'
// FIXME: 測定を有効化する
// import { Analytics } from '@vercel/analytics/next'
import type { Languages } from '@/lib/constants'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Languages }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'seo.meta' })

  return {
    title: {
      template: '%s | Bocker',
      default: t('title'),
    },
    description: t('description'),
    manifest: '/manifest.json',
    icons: {
      icon: '/favicon.ico',
      apple: '/apple-icon.png',
    },
    other: {
      'theme-color': '#f8faf8',
      'color-scheme': 'light dark',
    },
  }
}

type Props = {
  children: React.ReactNode
  params: Promise<{
    locale: Languages
  }>
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale)) {
    notFound()
  }

  // Providing all messages to the client side
  const messages = await getMessages({ locale })
  return (
    <NextIntlClientProvider messages={messages} locale={locale} timeZone="Asia/Tokyo">
      <ClientLayout locale={locale}>{children}</ClientLayout>
      {/* <Analytics /> */}
    </NextIntlClientProvider>
  )
}
