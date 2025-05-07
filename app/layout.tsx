import type { Metadata } from 'next'
import './globals.css'
import { ConvexClientProvider } from '@/components/providers'
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { Klee_One } from 'next/font/google'

const kleeOne = Klee_One({
  weight: ['400'],
  subsets: ['latin', 'greek-ext', 'latin-ext', 'cyrillic'],
  variable: '--font-klee-one',
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
      <body className={` ${kleeOne.variable} antialiased`}>
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
