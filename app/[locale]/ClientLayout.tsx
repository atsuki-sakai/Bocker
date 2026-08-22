'use client'

import '@/app/globals.css'
import { ConvexClientProvider } from '@/components/providers'
import { ConvexQueryCacheProvider } from 'convex-helpers/react/cache'
import { ClerkProvider } from '@clerk/nextjs'
import { enUS, jaJP, thTH } from '@clerk/localizations'
import { Toaster } from 'sonner'
import { ThemeProvider } from 'next-themes'
import { useTheme } from 'next-themes'
import { dark } from '@clerk/themes'
import GoogleAnalytics from '@/components/common/GoogleAnalytics'
import { AnalyticsTracker } from '@/hooks/useAnalytics'
import type { Languages } from '@/lib/constants'

const clerkLocalizations = { ja: jaJP, en: enUS, th: thTH } as const

export default function RootLayout({
  children,
  locale,
}: Readonly<{
  children: React.ReactNode
  locale: Languages
}>) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <LocalizedProviders locale={locale}>{children}</LocalizedProviders>
    </ThemeProvider>
  )
}

function LocalizedProviders({
  children,
  locale,
}: Readonly<{ children: React.ReactNode; locale: Languages }>) {
  const { resolvedTheme } = useTheme()

  return (
    <ClerkProvider
      dynamic
      localization={clerkLocalizations[locale]}
      appearance={{
        baseTheme: resolvedTheme === 'dark' ? dark : undefined,
        variables: {
          colorPrimary: resolvedTheme === 'dark' ? '#ff7655' : '#173f4a',
          colorText: resolvedTheme === 'dark' ? '#f2f7f6' : '#17323a',
        },
      }}
    >
      <ConvexClientProvider>
        <ConvexQueryCacheProvider>
          <GoogleAnalytics />
          <AnalyticsTracker />
          {children}
          <Toaster position="bottom-right" richColors />
        </ConvexQueryCacheProvider>
      </ConvexClientProvider>
    </ClerkProvider>
  )
}
