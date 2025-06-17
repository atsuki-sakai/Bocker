import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import '@/app/globals.css'

export const metadata: Metadata = {
  title: 'Bocker - お客様ページ',
  description: 'Bockerはサロンの予約管理を便利にするサービスです。',
}

export default function CustomerLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      storageKey="customer-theme"
      enableSystem
    >
      <div className="min-h-screen bg-background">
        {children}
      </div>
    </ThemeProvider>
  )
}