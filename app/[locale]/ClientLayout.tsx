'use client'

import '@/app/globals.css'
import { ConvexClientProvider } from '@/components/providers'
import { ClerkProvider } from '@clerk/nextjs'
import { jaJP } from '@clerk/localizations'
import { Toaster } from 'sonner'
import { ThemeProvider } from 'next-themes'
import { useTheme } from 'next-themes'
import { dark } from '@clerk/themes'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { resolvedTheme } = useTheme()

  return (
    <ClerkProvider
      dynamic
      localization={jaJP}
      appearance={{
        baseTheme: resolvedTheme === 'dark' ? dark : undefined,
        variables: {
          colorPrimary: '#000000',
          colorText: '#000000',
        },
      }}
    >
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <ConvexClientProvider>
          <div className="pb-12 md:pb-20">{children}</div>
          <Toaster position="top-right" richColors />
        </ConvexClientProvider>
      </ThemeProvider>
    </ClerkProvider>
  )
}
