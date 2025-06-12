import type { Metadata } from 'next'
import '../globals.css'
import { Noto_Sans_JP, Allerta_Stencil } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { notFound } from 'next/navigation'
import ClientLayout from './ClientLayout'
import type { Languages } from '@/lib/constants'

const notoJP = Noto_Sans_JP({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-noto-sans-jp',
})

const allertaStencil = Allerta_Stencil({
  weight: ['400'],
  subsets: ['latin'],
  variable: '--font-allerta-stencil',
})

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
    <html lang={locale} suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-title" content="Bocker" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className={`${notoJP.variable} ${allertaStencil.variable} antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <ClientLayout>{children}</ClientLayout>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
