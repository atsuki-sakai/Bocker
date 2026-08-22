import { describe, expect, it } from 'vitest'
import { R2StorageClient } from './R2StorageClient'

const createClient = () =>
  new R2StorageClient({
    accountId: '0123456789abcdef0123456789abcdef',
    accessKeyId: 'test-access-key',
    secretAccessKey: 'test-secret-key',
    bucketName: 'bocker-images',
    publicBaseUrl: 'https://cdn.bocker.jp/',
  })

describe('R2StorageClient', () => {
  it('同じ入力から同じ署名付きPUT URLを生成する', () => {
    const client = createClient()
    const now = new Date('2026-08-22T00:00:00.000Z')

    const first = client.createPresignedUrl('PUT', 'menu/original/org/image.webp', {
      contentType: 'image/webp',
      expiresIn: 1800,
      now,
    })
    const second = client.createPresignedUrl('PUT', 'menu/original/org/image.webp', {
      contentType: 'image/webp',
      expiresIn: 1800,
      now,
    })

    expect(first).toBe(second)
    const url = new URL(first)
    expect(url.hostname).toBe('0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com')
    expect(url.pathname).toBe('/bocker-images/menu/original/org/image.webp')
    expect(url.searchParams.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256')
    expect(url.searchParams.get('X-Amz-Expires')).toBe('1800')
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toBe('content-type;host')
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[a-f0-9]{64}$/)
    expect(first).not.toContain('test-secret-key')
  })

  it('公開URLでは各パス要素をエンコードする', () => {
    expect(createClient().getPublicUrl('menu/original/org/画像 1.webp')).toBe(
      'https://cdn.bocker.jp/menu/original/org/%E7%94%BB%E5%83%8F%201.webp'
    )
  })

  it('親ディレクトリを含むキーを拒否する', () => {
    expect(() => createClient().getPublicUrl('menu/../secret.webp')).toThrow(
      'R2 object key is invalid'
    )
  })

  it.each(['menu//image.webp', 'menu/./image.webp', 'menu\\image.webp'])(
    '曖昧なオブジェクトキーを拒否する: %s',
    (key) => {
      expect(() => createClient().getPublicUrl(key)).toThrow('R2 object key is invalid')
    }
  )

  it('署名対象ヘッダーの改行を拒否する', () => {
    expect(() =>
      createClient().createPresignedUrl('PUT', 'menu/image.webp', {
        contentType: 'image/webp\r\nx-injected: true',
      })
    ).toThrow('R2 signed header value is invalid')
  })
})
