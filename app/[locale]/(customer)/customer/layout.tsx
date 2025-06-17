import type { Metadata } from 'next'
import { Noto_Sans_JP } from 'next/font/google'
import { ClientLayout } from './ClientLayout'
import { ThemeProvider } from 'next-themes'

const notoSansJP = Noto_Sans_JP({
  variable: '--font-noto-sans-jp',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
})

export const metadata: Metadata = {
  title: 'カスタマーページ',
  description: '美容サロン予約システム - カスタマーページ',
}

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      storageKey="customer-theme"
      enableSystem
    >
      <ClientLayout fontVariables={[notoSansJP]}>
        {children}
      </ClientLayout>
    </ThemeProvider>
  )
}