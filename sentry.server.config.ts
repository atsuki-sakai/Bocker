// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
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
