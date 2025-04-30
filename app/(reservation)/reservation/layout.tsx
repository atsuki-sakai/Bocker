import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ClientLayout } from './ClientLayout'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Backer 予約受付ページ',
  description: 'Backer 予約受付ページ',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <ClientLayout fontVariables={[geistSans, geistMono]}>{children}</ClientLayout>
}
