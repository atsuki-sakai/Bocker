// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'
import { shouldEnableSentry } from './lib/sentry-enabled'

const sentryEnabled = shouldEnableSentry({
  override: process.env.SENTRY_ENABLED,
  vercelEnvironment: process.env.VERCEL_ENV,
})

Sentry.init({
  dsn: 'https://713a69815489a796680c1c275ea85de5@o4508853357576192.ingest.us.sentry.io/4509006291468288',

  // ローカル開発の設定ミスをSentryへ送らない。明示的にfalseを指定すれば本番でも停止可能。
  enabled: sentryEnabled,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
})
