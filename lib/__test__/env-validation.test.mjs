import { describe, expect, it } from 'vitest'
import {
  parseEnvFile,
  sharedRequiredKeys,
  validateEnvironment,
} from '../../scripts/validate-env.mjs'

const validEnvironment = Object.fromEntries(
  sharedRequiredKeys.map((key) => {
    if (key === 'NEXT_PUBLIC_CONVEX_URL') return [key, 'https://valid.convex.cloud']
    if (key === 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY') return [key, 'pk_test_valid']
    if (key === 'CLERK_SECRET_KEY') return [key, 'sk_test_valid']
    if (key.endsWith('_PROD_ID')) return [key, 'prod_valid']
    return [key, 'price_valid']
  })
)

describe('validate-env', () => {
  it('envファイルから値を読み取る', () => {
    expect(parseEnvFile("FOO=bar\nQUOTED='value'\n# COMMENT=x")).toEqual({
      FOO: 'bar',
      QUOTED: 'value',
    })
  })

  it('開発環境では本番URLを要求しない', () => {
    expect(validateEnvironment({ NODE_ENV: 'development', ...validEnvironment })).toEqual({
      missing: [],
      invalid: [],
    })
  })

  it('不足値と形式不正を値を露出せず報告する', () => {
    const result = validateEnvironment({
      NODE_ENV: 'development',
      ...validEnvironment,
      NEXT_PUBLIC_CONVEX_URL: 'http://localhost:3210',
      NEXT_PUBLIC_MICRO_MONTHLY_PRC_ID: 'replace_me',
    })

    expect(result.missing).toContain('NEXT_PUBLIC_MICRO_MONTHLY_PRC_ID')
    expect(result.invalid).toContain('NEXT_PUBLIC_CONVEX_URL')
  })

  it('本番環境ではデプロイURLを要求する', () => {
    expect(validateEnvironment({ NODE_ENV: 'production', ...validEnvironment }).missing).toContain(
      'NEXT_PUBLIC_DEPLOY_URL'
    )
  })
})
