import { createHash, createHmac } from 'node:crypto'

export interface R2StorageConfig {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  publicBaseUrl: string
}

interface PresignOptions {
  contentType?: string
  expiresIn?: number
  now?: Date
}

const AWS_ALGORITHM = 'AWS4-HMAC-SHA256'
const AWS_REGION = 'auto'
const AWS_SERVICE = 's3'
const UNSIGNED_PAYLOAD = 'UNSIGNED-PAYLOAD'

const encodeRfc3986 = (value: string) =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  )

const encodeObjectPath = (value: string) => value.split('/').map(encodeRfc3986).join('/')

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex')

const hmac = (key: Buffer | string, value: string) =>
  createHmac('sha256', key).update(value, 'utf8').digest()

const validateObjectKey = (key: string) => {
  const segments = key.split('/')
  if (
    !key ||
    key.startsWith('/') ||
    /[\u0000-\u001F\u007F\\]/.test(key) ||
    segments.some((segment) => !segment || segment === '.' || segment === '..')
  ) {
    throw new Error('R2 object key is invalid')
  }
}

const normalizeHeaderValue = (value: string) => {
  const normalized = value.trim()
  if (!normalized || /[\r\n]/.test(normalized)) {
    throw new Error('R2 signed header value is invalid')
  }
  return normalized
}

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, '')

/**
 * Cloudflare R2 の S3 互換APIを扱う最小クライアント。
 * 依存パッケージを増やさず、AWS Signature Version 4 の期限付きURLを生成する。
 */
export class R2StorageClient {
  private readonly config: R2StorageConfig

  constructor(config: R2StorageConfig) {
    const missing = Object.entries(config)
      .filter(([, value]) => !value)
      .map(([key]) => key)

    if (missing.length > 0) {
      throw new Error(`R2 configuration is missing: ${missing.join(', ')}`)
    }

    this.config = {
      ...config,
      publicBaseUrl: normalizeBaseUrl(config.publicBaseUrl),
    }
  }

  get bucketName(): string {
    return this.config.bucketName
  }

  getPublicUrl(key: string): string {
    validateObjectKey(key)
    return `${this.config.publicBaseUrl}/${encodeObjectPath(key)}`
  }

  createPresignedUrl(method: 'PUT' | 'DELETE', key: string, options: PresignOptions = {}): string {
    validateObjectKey(key)

    const expiresIn = options.expiresIn ?? 30 * 60
    if (!Number.isInteger(expiresIn) || expiresIn < 1 || expiresIn > 7 * 24 * 60 * 60) {
      throw new Error('R2 presigned URL expiration must be between 1 and 604800 seconds')
    }

    const now = options.now ?? new Date()
    const isoDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
    const dateStamp = isoDate.slice(0, 8)
    const host = `${this.config.accountId}.r2.cloudflarestorage.com`
    const canonicalUri = `/${encodeRfc3986(this.config.bucketName)}/${encodeObjectPath(key)}`
    const credentialScope = `${dateStamp}/${AWS_REGION}/${AWS_SERVICE}/aws4_request`

    const headers: Array<[string, string]> = [['host', host]]
    if (options.contentType) {
      headers.unshift(['content-type', normalizeHeaderValue(options.contentType)])
    }

    const signedHeaders = headers.map(([name]) => name).join(';')
    const canonicalHeaders = headers.map(([name, value]) => `${name}:${value}\n`).join('')
    const queryParameters: Array<[string, string]> = [
      ['X-Amz-Algorithm', AWS_ALGORITHM],
      ['X-Amz-Content-Sha256', UNSIGNED_PAYLOAD],
      ['X-Amz-Credential', `${this.config.accessKeyId}/${credentialScope}`],
      ['X-Amz-Date', isoDate],
      ['X-Amz-Expires', String(expiresIn)],
      ['X-Amz-SignedHeaders', signedHeaders],
    ]
    const canonicalQueryString = queryParameters
      .map(([name, value]) => [encodeRfc3986(name), encodeRfc3986(value)] as const)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([name, value]) => `${name}=${value}`)
      .join('&')

    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      UNSIGNED_PAYLOAD,
    ].join('\n')
    const stringToSign = [AWS_ALGORITHM, isoDate, credentialScope, sha256(canonicalRequest)].join(
      '\n'
    )

    const dateKey = hmac(`AWS4${this.config.secretAccessKey}`, dateStamp)
    const regionKey = hmac(dateKey, AWS_REGION)
    const serviceKey = hmac(regionKey, AWS_SERVICE)
    const signingKey = hmac(serviceKey, 'aws4_request')
    const signature = createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex')

    return `https://${host}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`
  }

  async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    const url = this.createPresignedUrl('PUT', key, { contentType, expiresIn: 15 * 60 })
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
      body: Uint8Array.from(body),
    })

    if (!response.ok) {
      const responseBody = await response.text().catch(() => '')
      throw new Error(`R2 upload failed (${response.status}): ${responseBody.slice(0, 500)}`)
    }
  }

  async deleteObject(key: string): Promise<void> {
    const url = this.createPresignedUrl('DELETE', key, { expiresIn: 15 * 60 })
    const response = await fetch(url, { method: 'DELETE' })

    if (!response.ok && response.status !== 404) {
      const responseBody = await response.text().catch(() => '')
      throw new Error(`R2 delete failed (${response.status}): ${responseBody.slice(0, 500)}`)
    }
  }
}
