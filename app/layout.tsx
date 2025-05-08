import type { Metadata } from 'next'
import './globals.css'
import { ConvexClientProvider } from '@/components/providers'
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from 'sonner'
import { Noto_Sans_JP } from 'next/font/google'

const notoJP = Noto_Sans_JP({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-noto-sans-jp',
})

export const metadata: Metadata = {
  title: 'Bcker - 予約管理サービス',
  description: 'Bckerはサロンの予約管理を便利にするサービスです。',
  icons: {
    icon: '/convex.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className={`${notoJP.variable} antialiased`}>
        <ClerkProvider dynamic>
          <ConvexClientProvider>
            {children}
            <Toaster position="top-right" richColors />
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}
