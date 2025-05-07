import type { Metadata } from 'next'
import './globals.css'
import { ConvexClientProvider } from '@/components/providers'
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { Klee_One, Noto_Sans_JP } from 'next/font/google'

const kleeOne = Klee_One({
  weight: ['400'],
  subsets: ['latin', 'greek-ext', 'latin-ext', 'cyrillic'],
  display: 'swap',
  variable: '--font-klee-one',
})

// Noto Sans JP（日本語用）
const notoJP = Noto_Sans_JP({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
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
      <body className={` ${kleeOne.variable} ${notoJP.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ClerkProvider dynamic>
            <ConvexClientProvider>
              {children}
              <Toaster position="top-right" richColors />
            </ConvexClientProvider>
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
