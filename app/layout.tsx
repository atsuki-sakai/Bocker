import type { Metadata } from 'next'
import './globals.css'
import { ConvexClientProvider } from '@/components/providers'
import { ClerkProvider } from '@clerk/nextjs'
import { jaJP } from '@clerk/localizations'
import { Toaster } from 'sonner'
import { Noto_Sans_JP, Allerta_Stencil } from 'next/font/google'
import { ThemeProvider } from 'next-themes'

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
  icons: {
    icon: '/icon0.svg',
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
        <meta name="apple-mobile-web-app-title" content="Bocker" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className={`${notoJP.variable} ${allertaStencil.variable} antialiased`}>
        <ClerkProvider dynamic localization={jaJP}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ConvexClientProvider>
              {children}
              <Toaster position="top-right" richColors />
            </ConvexClientProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}
