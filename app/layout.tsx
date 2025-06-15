import './globals.css'
import type { Metadata } from 'next'
import { Noto_Sans_JP, Allerta_Stencil } from 'next/font/google'

// フォントの読み込み
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      {/* NOTE: lang 属性はロケールレイアウトで上書きされる */}
      <head>
        <meta name="apple-mobile-web-app-title" content="Bocker" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className={`${notoJP.variable} ${allertaStencil.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
