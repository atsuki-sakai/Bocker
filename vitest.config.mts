/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    env: {
      NODE_ENV: 'test',
      NEXT_PUBLIC_DEPLOY_URL: 'http://localhost:3000',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      NEXT_PUBLIC_DEVELOP_URL: 'http://localhost:3000',

      // Convex設定
      CONVEX_DEPLOYMENT: 'dev:optimistic-herring-662',
      NEXT_PUBLIC_CONVEX_URL: 'https://optimistic-herring-662.convex.cloud',
      NEXT_PUBLIC_CONVEX_AUD: 'convex',

      // Clerk認証設定
      CLERK_JWT_ISSUER_DOMAIN: 'https://distinct-muskox-3.clerk.accounts.dev',
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
        'pk_test_ZGlzdGluY3QtbXVza294LTMuY2xlcmsuYWNjb3VudHMuZGV2JA',
      CLERK_SECRET_KEY: 'sk_test_6HdomeRplYVEdqcQqCS8pwTrfv2S16asx1bpwwCgxs',
      CLERK_WEBHOOK_SECRET: 'whsec_test_mock',
      CLERK_WEBHOOK_SIGNING_SECRET: 'whsec_test_clerk_webhook',
      NEXT_PUBLIC_CLERK_SIGN_UP_URL: '/sign-up',
      NEXT_PUBLIC_CLERK_SIGN_UP_REDIRECT_URL: '/dashboard',
      NEXT_PUBLIC_CLERK_SIGN_IN_REDIRECT_URL: '/dashboard',

      // Stripe決済設定
      STRIPE_SECRET_KEY: 'sk_test_mock',
      STRIPE_CONNECT_WEBHOOK_SECRET: 'whsec_test_mock',
      STRIPE_SUBSCRIPTION_WEBHOOK_SECRET: 'whsec_test_mock',
      STRIPE_CHECKOUT_WEBHOOK_SECRET: 'whsec_test_mock',
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_mock',

      // Stripe商品設定
      NEXT_PUBLIC_MICRO_PROD_ID: 'prod_test_mock_micro',
      NEXT_PUBLIC_LITE_PROD_ID: 'prod_test_mock_lite',
      NEXT_PUBLIC_PRO_PROD_ID: 'prod_test_mock_pro',

      // Stripe価格設定
      NEXT_PUBLIC_MICRO_MONTHLY_PRC_ID: 'price_test_mock_micro_monthly',
      NEXT_PUBLIC_MICRO_YEARLY_PRC_ID: 'price_test_mock_micro_yearly',
      NEXT_PUBLIC_LITE_MONTHLY_PRC_ID: 'price_test_mock_lite_monthly',
      NEXT_PUBLIC_LITE_YEARLY_PRC_ID: 'price_test_mock_lite_yearly',
      NEXT_PUBLIC_PRO_MONTHLY_PRC_ID: 'price_test_mock_pro_monthly',
      NEXT_PUBLIC_PRO_YEARLY_PRC_ID: 'price_test_mock_pro_yearly',

      // その他のテスト用設定
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test_anon_key',
      GCP_AI_STUDIO_API_KEY: 'test_gcp_ai_studio_key',
      COMPANY_LINE_CHANNEL_ACCESS_TOKEN: 'test_line_token',
      RESEND_API_KEY: 're_test_key',
      RESEND_FROM_EMAIL: 'test@example.com',
      NEXT_PUBLIC_CHANNEL_TALK_PLUGIN_KEY: 'test_channel_talk_key',
    },
    css: true,
    pool: 'forks',
    poolOptions: {
      forks: {
        maxForks: 4,
        minForks: 1,
        isolate: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '.next/',
        'coverage/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/**',
        'convex/_generated/**',
        'app/api/**/*.ts',
        '**/*.test.*',
        '**/*.spec.*',
        '**/node_modules/**', // 明示的に追加
        '**/.next/**', // 明示的に追加
        '**/dist/**', // 明示的に追加
        '**/coverage/**', // 明示的に追加
        '**/__tests__/node_modules/**', // 特別に追加
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
    include: [
      'app/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'components/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'lib/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'hooks/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'services/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      '**/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      '**/_components/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    exclude: [
      'node_modules/',
      '.next/',
      'convex/_generated/',
      'app/api/',
      'e2e/',
      '**/node_modules/**', // 明示的に追加
      '**/.next/**', // 明示的に追加
      '**/dist/**', // 明示的に追加
      '**/coverage/**', // 明示的に追加
      '**/__tests__/node_modules/**',
    ],
    testTimeout: 30000,
    hookTimeout: 60000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
      '@/components': resolve(__dirname, './components'),
      '@/lib': resolve(__dirname, './lib'),
      '@/hooks': resolve(__dirname, './hooks'),
      '@/app': resolve(__dirname, './app'),
      '@/convex': resolve(__dirname, './convex'),
      '@/services': resolve(__dirname, './services'),
    },
  },
})