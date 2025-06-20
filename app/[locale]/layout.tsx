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

export const metadata: Metadata = {
  title: 'Bocker - 予約管理システム',
  description:
    'Bockerはサロンの予約管理、顧客管理、サロン運営を一元管理し運用業務の効率化を目的としたシステムです。',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.png',
  },
}

type Props = {
  children: React.ReactNode
  // Next.js v15 では params は Promise になる
  params: Promise<{ locale: string }>
}

export default async function LocaleLayout({ children, params }: Props) {
  // params は Promise となるため非同期で展開する
  const { locale } = await params

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as Languages)) {
    notFound()
  }

  // Providing all messages to the client side
  const messages = await getMessages()

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <ClientLayout>{children}</ClientLayout>
      {/* <Analytics /> */}
    </NextIntlClientProvider>
  )
}
