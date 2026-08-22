import { describe, expect, it } from 'vitest'
import en from '@/languages/en.json'
import th from '@/languages/th.json'

function flatten(value: unknown, path: string[] = [], result = new Map<string, string>()) {
  if (typeof value === 'string') {
    result.set(path.join('.'), value)
    return result
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => flatten(item, [...path, String(index)], result))
    return result
  }

  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => flatten(item, [...path, key], result))
  }

  return result
}

function placeholders(value: string) {
  return [...value.matchAll(/\{[^{}]+\}/g)].map(([placeholder]) => placeholder).sort()
}

describe('アプリケーションロケール', () => {
  const english = flatten(en)
  const thai = flatten(th)

  it('英語・タイ語で同じ翻訳キーを持つ', () => {
    expect([...thai.keys()]).toEqual([...english.keys()])
  })

  it('タイ語でも差し込みプレースホルダーを保持する', () => {
    english.forEach((value, key) => {
      expect(placeholders(thai.get(key) ?? '')).toEqual(placeholders(value))
    })
  })

  it('主要画面にタイ語翻訳が設定されている', () => {
    expect(th.language.thai).toBe('ไทย')
    expect(th.navigation.dashboard).toMatch(/[ก-๛]/)
    expect(th.auth.signIn.title).toMatch(/[ก-๛]/)
    expect(th.landing.hero.title).toMatch(/[ก-๛]/)
  })
})
