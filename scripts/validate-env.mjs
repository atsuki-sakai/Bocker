import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const sharedRequiredKeys = [
  'NEXT_PUBLIC_CONVEX_URL',
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'NEXT_PUBLIC_MICRO_PROD_ID',
  'NEXT_PUBLIC_LITE_PROD_ID',
  'NEXT_PUBLIC_PRO_PROD_ID',
  'NEXT_PUBLIC_MICRO_MONTHLY_PRC_ID',
  'NEXT_PUBLIC_MICRO_YEARLY_PRC_ID',
  'NEXT_PUBLIC_LITE_MONTHLY_PRC_ID',
  'NEXT_PUBLIC_LITE_YEARLY_PRC_ID',
  'NEXT_PUBLIC_PRO_MONTHLY_PRC_ID',
  'NEXT_PUBLIC_PRO_YEARLY_PRC_ID',
]

const placeholderPattern = /(?:replace[_-]?me|example|your[_-])/i

export const parseEnvFile = (source) => {
  const result = {}

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!match) continue

    let value = match[2].trim()
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1)
    }

    result[match[1]] = value
  }

  return result
}

const isMissing = (value) =>
  typeof value !== 'string' || value.trim() === '' || placeholderPattern.test(value)

const hasPrefix = (value, prefixes) => prefixes.some((prefix) => value.startsWith(prefix))

export const validateEnvironment = (env) => {
  const nodeEnv = env.NODE_ENV || 'development'
  const requiredKeys = [
    ...sharedRequiredKeys,
    ...(nodeEnv === 'production' ? ['NEXT_PUBLIC_DEPLOY_URL'] : []),
  ]
  const missing = requiredKeys.filter((key) => isMissing(env[key]))
  const invalid = []

  const checkPrefix = (key, prefixes) => {
    const value = env[key]
    if (!isMissing(value) && !hasPrefix(value, prefixes)) invalid.push(key)
  }

  checkPrefix('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', ['pk_test_', 'pk_live_'])
  checkPrefix('CLERK_SECRET_KEY', ['sk_test_', 'sk_live_'])

  for (const key of sharedRequiredKeys.filter((key) => key.endsWith('_PROD_ID'))) {
    checkPrefix(key, ['prod_'])
  }
  for (const key of sharedRequiredKeys.filter((key) => key.endsWith('_PRC_ID'))) {
    checkPrefix(key, ['price_'])
  }

  const convexUrl = env.NEXT_PUBLIC_CONVEX_URL
  if (!isMissing(convexUrl)) {
    try {
      const url = new URL(convexUrl)
      if (url.protocol !== 'https:' || !url.hostname.endsWith('.convex.cloud')) {
        invalid.push('NEXT_PUBLIC_CONVEX_URL')
      }
    } catch {
      invalid.push('NEXT_PUBLIC_CONVEX_URL')
    }
  }

  const clerkPublishableKey = env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  const clerkSecretKey = env.CLERK_SECRET_KEY
  if (
    !isMissing(clerkPublishableKey) &&
    !isMissing(clerkSecretKey) &&
    ((clerkPublishableKey.startsWith('pk_test_') && !clerkSecretKey.startsWith('sk_test_')) ||
      (clerkPublishableKey.startsWith('pk_live_') && !clerkSecretKey.startsWith('sk_live_')))
  ) {
    invalid.push('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY / CLERK_SECRET_KEY (environment mismatch)')
  }

  return {
    missing: [...new Set(missing)],
    invalid: [...new Set(invalid)],
  }
}

const isDirectRun = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  const envPath = resolve(process.cwd(), '.env.local')
  const fileEnv = existsSync(envPath) ? parseEnvFile(readFileSync(envPath, 'utf8')) : {}
  const env = { ...fileEnv, ...process.env }
  const { missing, invalid } = validateEnvironment(env)

  if (missing.length > 0 || invalid.length > 0) {
    console.error('Development environment configuration is incomplete.')
    if (!existsSync(envPath)) console.error('- .env.local is missing')
    if (missing.length > 0) console.error(`- Missing: ${missing.join(', ')}`)
    if (invalid.length > 0) console.error(`- Invalid: ${invalid.join(', ')}`)
    console.error(
      '- Run `pnpm env:login`, then `pnpm env:dev`, or copy .env.example to .env.local.'
    )
    process.exitCode = 1
  } else {
    console.log('Environment configuration is valid.')
  }
}
