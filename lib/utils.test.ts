import { describe, it, expect } from 'vitest'

describe('サンプルテスト', () => {
  it('基本的な計算ができる', () => {
    expect(2 + 2).toBe(4)
  })

  it('文字列の結合ができる', () => {
    expect('Hello' + ' ' + 'World').toBe('Hello World')
  })

  it('配列の操作ができる', () => {
    const arr = [1, 2, 3]
    expect(arr.length).toBe(3)
    expect(arr.includes(2)).toBe(true)
  })

  it('オブジェクトの比較ができる', () => {
    const obj = { name: 'Test', value: 42 }
    expect(obj).toEqual({ name: 'Test', value: 42 })
  })
})