import { withSentryConfig } from '@sentry/nextjs'
import bundleAnalyzer from '@next/bundle-analyzer'
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

// bundle-analyzerの設定
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  // openAnalyzer: false, // 必要なら自動ブラウザ起動を抑制
  // reportFilename: 'report.html', // 任意の出力名
})
const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    // Vercelの非公開システム変数を、client instrumentation用の公開ビルド値へ橋渡しする。
    NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV || '',
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/bocker_storage/**', // 必要ならパス制限
      },
      { protocol: 'https', hostname: 'cdn.bocker.jp', pathname: '**' },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.jp',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'tailwindcss.com',
      },
      // CDNドメインのサポート（環境変数から動的に設定）
      ...(() => {
        const cdnDomain = process.env.NEXT_PUBLIC_CDN_DOMAIN
        if (!cdnDomain) return []
        try {
          const cdnUrl = new URL(cdnDomain)
          return [
            {
              protocol: 'https' as const,
              hostname: cdnUrl.hostname,
            },
          ]
        } catch {
          console.warn('Invalid CDN domain:', cdnDomain)
          return []
        }
      })(),
    ],
  },
}

export default withSentryConfig(withBundleAnalyzer(withNextIntl(nextConfig)), {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: 'freelance-kt',
  project: 'bcker',

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: '/monitoring',

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
})
