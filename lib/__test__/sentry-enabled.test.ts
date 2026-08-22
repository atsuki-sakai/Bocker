import { describe, expect, it } from 'vitest'
import { shouldEnableSentry } from '../sentry-enabled'

describe('shouldEnableSentry', () => {
  it('Vercel Productionでのみ既定で有効にする', () => {
    expect(shouldEnableSentry({ vercelEnvironment: 'production' })).toBe(true)
    expect(shouldEnableSentry({ vercelEnvironment: 'preview' })).toBe(false)
    expect(shouldEnableSentry({ vercelEnvironment: 'development' })).toBe(false)
    expect(shouldEnableSentry({})).toBe(false)
  })

  it('明示フラグで有効・無効を上書きする', () => {
    expect(shouldEnableSentry({ override: 'true', vercelEnvironment: 'development' })).toBe(true)
    expect(shouldEnableSentry({ override: 'false', vercelEnvironment: 'production' })).toBe(false)
  })
})
