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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Languages }>
}): Promise<Metadata> {
  await params // localeは現在使用していないが、将来的に多言語対応で使用予定
  
  return {
    title: {
      template: '%s | Bocker',
      default: 'Bocker - 予約管理システム',
    },
    description:
      'Bockerはサロンの予約管理、顧客管理、サロン運営を一元管理し運用業務の効率化を目的としたシステムです。',
    manifest: '/manifest.json',
    icons: {
      icon: '/favicon.ico',
      apple: '/apple-icon.png',
    },
    other: {
      'theme-color': '#ffffff',
      'color-scheme': 'light dark',
    },
  }
}

type Props = {
  children: React.ReactNode
  params: {
    locale: Languages
  }
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
      <ClientLayout>{children}</ClientLayout>
      {/* <Analytics /> */}
    </NextIntlClientProvider>
  )
}
