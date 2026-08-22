import { afterEach, describe, expect, it, vi } from 'vitest'

const existingRequiredEnv = {
  NEXT_PUBLIC_CONVEX_URL: 'https://example.convex.cloud',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_example',
  CLERK_SECRET_KEY: 'sk_test_example',
  STRIPE_SECRET_KEY: 'sk_test_example',
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'example-role-key',
}

const r2RequiredEnv = {
  CLOUDFLARE_R2_ACCOUNT_ID: 'example-account-id',
  CLOUDFLARE_R2_ACCESS_KEY_ID: 'example-access-key-id',
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: 'example-secret-access-key',
  CLOUDFLARE_R2_BUCKET_NAME: 'bocker-images',
  NEXT_PUBLIC_CDN_DOMAIN: 'https://cdn.bocker.jp',
}

const stubEnv = (values: Record<string, string>) => {
  Object.entries(values).forEach(([key, value]) => vi.stubEnv(key, value))
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('validateEnv', () => {
  it('R2の必須環境変数が空の場合はデプロイ前に失敗する', async () => {
    stubEnv(existingRequiredEnv)
    stubEnv(Object.fromEntries(Object.keys(r2RequiredEnv).map((key) => [key, ''])))

    const { validateEnv } = await import('./env-config')

    expect(() => validateEnv()).toThrow(/CLOUDFLARE_R2_ACCOUNT_ID/)
    expect(() => validateEnv()).toThrow(/NEXT_PUBLIC_CDN_DOMAIN/)
  })

  it('既存サービスとR2の必須環境変数が揃っていれば成功する', async () => {
    stubEnv(existingRequiredEnv)
    stubEnv(r2RequiredEnv)

    const { validateEnv } = await import('./env-config')

    expect(() => validateEnv()).not.toThrow()
  })
})
