#!/usr/bin/env tsx
import { validateEnv } from '../lib/env-config'

try {
  validateEnv()
  console.log('Environment OK: required variables present')
  process.exit(0)
} catch (err) {
  console.error('Environment validation failed:')
  if (err instanceof Error) {
    console.error(err.message)
  } else {
    console.error(err)
  }
  process.exit(1)
}
