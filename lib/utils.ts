import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import Stripe from 'stripe'
import { BillingPeriod } from '@/services/convex/shared/types/common'
import imageCompression from 'browser-image-compression'
import CryptoJS from 'crypto-js' // CryptoJSをインポート

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 指数バックオフで再試行を行う関数
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 500
): Promise<T> {
  let retries = 0

  while (true) {
    try {
      return await operation()
    } catch (error) {
      retries++
      if (retries > maxRetries) {
        console.error(`最大${maxRetries}回の再試行後、処理に失敗しました:`, error)
        throw error
      }
      // 指数バックオフ + ランダム要素（ジッター）を適用
      const exponentialDelay = Math.min(5000, Math.pow(2, retries - 1) * baseDelay)
      // ジッター適用後に最小1秒、最大5秒の範囲に収める
      // const jitter = Math.random(); // このジッター計算だと最小値が保証されない
      // 遅延時間は baseDelay から exponentialDelay の範囲でランダムに調整
      const delay = Math.max(
        baseDelay, // 最低遅延時間
        Math.floor(exponentialDelay * (0.5 + Math.random() * 0.5)) // baseDelayから指数遅延の間でランダムに
      )

      console.log(`処理を ${delay}ms 後に再試行します (試行回数: ${retries}/${maxRetries})`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
}

export function timestampToJSTISO(timestamp: number) {
  const date = new Date(timestamp)
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const year = parts.find((p) => p.type === 'year')?.value
  const month = parts.find((p) => p.type === 'month')?.value
  const day = parts.find((p) => p.type === 'day')?.value
  const hour = parts.find((p) => p.type === 'hour')?.value
  const minute = parts.find((p) => p.type === 'minute')?.value
  const second = parts.find((p) => p.type === 'second')?.value

  // フォーマットをYYYY-MM-DDTHH:mm:ss+09:00に修正
  return `${year}-${month}-${day}T${hour}:${minute}:${second}+09:00`
}

// Stripeのサブスクリプションステータスを正規化する関数
export function normalizeSubscriptionStatus(subscription: Stripe.Subscription): string {
  const { status } = subscription

  // Status handling for business logic
  switch (status) {
    // Treat as active: make sure these are considered valid subscriptions
    case 'incomplete': // 支払いがまだ完了していないが、購読は進行中
    case 'trialing': // トライアル期間中
      return 'active'

    // Handle payment issues
    case 'past_due': // 支払い期限切れ
    case 'unpaid': // 未払い
      console.log(`支払い問題を検出: サブスクリプション ${subscription.id} は ${status} 状態です`)
      // ここでは "payment_issue" として返すことも可能だが、Stripeのステータスをそのまま返すことで、
      // より詳細な状態を呼び出し元で判断できるようにする
      return status

    // Other standard states
    case 'active':
    case 'canceled':
    case 'incomplete_expired': // incompleteのまま期限切れ
    case 'paused': // 一時停止中 (Stripeの新しいステータス)
      return status

    // Fallback for unknown/future states
    default:
      console.warn(`未知のサブスクリプションステータス: ${status}, ID: ${subscription.id}`)
      return status // 未知のステータスもそのまま返す
  }
}

export const generatePinCode = () => {
  // ピンコードの最小長を定義（6文字以上）
  const PIN_LENGTH = 6

  const upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowerChars = 'abcdefghijklmnopqrstuvwxyz'
  const numberChars = '0123456789'
  const allChars = upperChars + lowerChars + numberChars

  // 必ず含めたい文字をそれぞれ１文字ずつ取得
  const requiredChars = [
    upperChars[Math.floor(Math.random() * upperChars.length)],
    lowerChars[Math.floor(Math.random() * lowerChars.length)],
    numberChars[Math.floor(Math.random() * numberChars.length)],
  ]

  // 残りの文字数分だけランダムに取得
  const remainingCount = PIN_LENGTH - requiredChars.length
  if (remainingCount < 0) {
    // PIN_LENGTH が3未満の場合、エラーまたはPIN_LENGTHを増やすなどの対応が必要
    // 今回のコードではPIN_LENGTH=6なので問題ないが、念のため
    throw new Error('PIN_LENGTH must be at least 3 to include all required character types.')
  }
  const remainingChars: string[] = []
  for (let i = 0; i < remainingCount; i++) {
    remainingChars.push(allChars[Math.floor(Math.random() * allChars.length)])
  }

  // 必須文字＋残り文字をまとめてシャッフル（Fisher–Yates アルゴリズム）
  const pinArray = [...requiredChars, ...remainingChars]
  for (let i = pinArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pinArray[i], pinArray[j]] = [pinArray[j], pinArray[i]]
  }

  const pinCode = pinArray.join('')
  return pinCode
}

// Stripeの課金期間をConvexの課金期間に変換
export function priceIdToPlanInfo(priceId: string) {
  // 環境変数へのアクセスはサーバーサイドで行うべきですが、
  // この関数がクライアントサイドでも使われる可能性があるため、
  // undefinedチェックやエラーハンドリングを強化します。
  // 理想的には、価格情報はサーバーから取得するか、
  // クライアントサイドで必要な最小限の情報のみを持つべきです。

  switch (priceId) {
    case process.env.NEXT_PUBLIC_LITE_MONTHLY_PRC_ID:
      return {
        name: 'Lite',
        price: 6000, // 価格情報も環境変数から取得するか、安全な方法で管理すべき
      }
    case process.env.NEXT_PUBLIC_LITE_YEARLY_PRC_ID:
      return {
        name: 'Lite',
        price: 50000,
      }
    case process.env.NEXT_PUBLIC_PRO_MONTHLY_PRC_ID:
      return {
        name: 'Pro',
        price: 10000,
      }
    case process.env.NEXT_PUBLIC_PRO_YEARLY_PRC_ID:
      return {
        name: 'Pro',
        price: 100000,
      }
    case process.env.NEXT_PUBLIC_ENTRPIS_MONTHLY_PRC_ID:
      return {
        name: 'Enterprise',
        price: 16000,
      }
    case process.env.NEXT_PUBLIC_ENTRPIS_YEARLY_PRC_ID:
      return {
        name: 'Enterprise',
        price: 153600,
      }
    default:
      // 無効なpriceIdの場合は明確なエラーを返す
      return new Error(`Invalid or unknown priceId: ${priceId}`)
  }
}

// プランと課金期間から価格IDを取得する関数
export function getPriceStrFromPlanAndPeriod(planStr: string, period: BillingPeriod): string {
  planStr = planStr.toLowerCase()

  let priceId: string | undefined

  if (period === 'monthly') {
    switch (planStr) {
      case 'lite':
        priceId = process.env.NEXT_PUBLIC_LITE_MONTHLY_PRC_ID
        break
      case 'pro':
        priceId = process.env.NEXT_PUBLIC_PRO_MONTHLY_PRC_ID
        break
      case 'enterprise':
        priceId = process.env.NEXT_PUBLIC_ENTRPIS_MONTHLY_PRC_ID
        break
      default:
        throw new Error(`Invalid plan ID: ${planStr}`)
    }
  } else {
    // period === 'yearly'
    switch (planStr) {
      case 'lite':
        priceId = process.env.NEXT_PUBLIC_LITE_YEARLY_PRC_ID
        break
      case 'pro':
        priceId = process.env.NEXT_PUBLIC_PRO_YEARLY_PRC_ID
        break
      case 'enterprise':
        priceId = process.env.NEXT_PUBLIC_ENTRPIS_YEARLY_PRC_ID
        break
      default:
        throw new Error(`Invalid plan ID: ${planStr}`)
    }
  }

  // 環境変数が設定されているかチェック
  if (!priceId) {
    throw new Error(
      `Price ID not configured for plan "${planStr}" and period "${period}". Check environment variables.`
    )
  }

  return priceId
}

// ファイルをBase64に変換する関数
export async function fileToBase64(file: File): Promise<string> {
  // ブラウザ環境でのみ実行可能であることを確認
  if (typeof window === 'undefined' || !window.FileReader) {
    throw new Error('fileToBase64 can only be used in a browser environment.')
  }

  const base64Promise = new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('ファイルの読み込み結果が文字列ではありません。'))
        return
      }
      const base64String = reader.result as string
      // data:image/jpeg;base64,の部分を除去
      const base64Data = base64String.split(',')[1]
      if (!base64Data) {
        reject(new Error('Base64データ部分の取得に失敗しました。'))
        return
      }
      resolve(base64Data)
    }
    reader.onerror = (error) => {
      reject(
        new Error(`ファイルの読み込みエラー: ${error?.target?.error?.message || '不明なエラー'}`)
      )
    }
    reader.readAsDataURL(file)
  })

  return base64Promise
}

/**
 * 画像ファイルからオリジナル画像とサムネイル画像を同時に生成する
 * @param file アップロードする画像ファイル
 * @returns オリジナル画像とサムネイル画像のFileオブジェクト
 */
export async function createImageWithThumbnail(
  file: File
): Promise<{ original: File; thumbnail: File }> {
  // 画像ファイルの形式を確認
  if (!file.type.startsWith('image/')) {
    throw new Error('画像ファイルのみ対応しています')
  }

  try {
    // オリジナル画像の生成（最適化）
    const originalOptions = {
      maxSizeMB: 2,
      maxWidthOrHeight: 1200,
      webpQuality: 90,
      useWebWorker: true
    }
    const originalFile = await compressAndConvertToWebP(file, originalOptions)

    // サムネイル画像の生成
    const thumbnailOptions = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 250,
      webpQuality: 80,
      useWebWorker: true
    }
    const thumbnailFile = await compressAndConvertToWebP(file, thumbnailOptions)

    // ファイル名にサフィックスを追加（サムネイル）
    const thumbnailFileName = file.name.replace(/(\.[^.]+)$/, '-thumbnail$1')
    const renamedThumbnail = new File([thumbnailFile], thumbnailFileName, {
      type: thumbnailFile.type
    })

    return {
      original: originalFile,
      thumbnail: renamedThumbnail
    }
  } catch (error) {
    console.error('画像処理エラー:', error)
    throw new Error('画像の処理中にエラーが発生しました')
  }
}

// 画像圧縮とWebP変換の関数を追加
export async function compressAndConvertToWebP(
  file: File,
  options?: {
    maxSizeMB?: number
    maxWidthOrHeight?: number
    webpQuality?: number
    useWebWorker?: boolean
  }
): Promise<File> {
  // ブラウザ環境でのみ実行可能であることを確認
  if (
    typeof window === 'undefined' ||
    !window.FileReader ||
    !window.Image ||
    !window.HTMLCanvasElement
  ) {
    throw new Error('compressAndConvertToWebP can only be used in a browser environment.')
  }
  if (!imageCompression) {
    throw new Error('imageCompression library is not loaded.')
  }

  try {
    // 画像を圧縮（デフォルト値を改善）
    const compressionOptions = {
      maxSizeMB: options?.maxSizeMB ?? 0.5, // 最大サイズを0.5MB（デフォルト）
      maxWidthOrHeight: options?.maxWidthOrHeight ?? 1024, // 最大幅/高さを1024px
      useWebWorker: options?.useWebWorker ?? true,
      // fileType: 'image/webp', // imageCompression側でWebPを指定するオプションもあるが、ここではcanvasで変換
      signal: undefined, // 必要に応じてAbortControllerからのSignalを渡す
    }

    // オリジナルファイルがWebPの場合は圧縮のみ実行し、変換はスキップ
    if (file.type === 'image/webp') {
      console.log('元のファイルがWebP形式のため、圧縮のみ実行します。')
      return await imageCompression(file, compressionOptions)
    }

    const compressedFile = await imageCompression(file, compressionOptions)

    // WebP形式に変換
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (!event.target?.result) {
          reject(new Error('画像の読み込みに失敗しました'))
          return
        }

        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Canvasコンテキストの取得に失敗しました'))
            return
          }

          ctx.drawImage(img, 0, 0)

          // WebP形式に変換（品質を指定）
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('WebP変換に失敗しました'))
                return
              }

              // 新しいファイル名を生成（元のファイル名の拡張子をwebpに変更）
              // 元ファイル名に拡張子がない場合の考慮も追加
              const fileName = file.name.replace(/\.[^/.]+$/, '') + '.webp'

              // Blobから新しいFileオブジェクトを作成
              const webpFile = new File([blob], fileName, { type: 'image/webp' })
              resolve(webpFile)
            },
            'image/webp',
            options?.webpQuality ?? 0.8 // 品質を0.8（デフォルト）、必要に応じて変更
          )
        }

        img.onerror = () => reject(new Error('画像の読み込みに失敗しました'))
        // imageCompressionはBlobを返す可能性があるため、URL.createObjectURLを使用
        // もしcompressedFileがFile/BlobならURL.createObjectURLがより適切
        // imageCompressionはFileオブジェクトを返すので、そのままreadAsDataURLでOK
        img.src = event.target.result as string
      }

      reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'))
      // 圧縮後のファイルを読み込む
      reader.readAsDataURL(compressedFile)
    })
  } catch (error) {
    console.error('画像圧縮/変換エラー:', error)
    // エラーメッセージをより詳細にする
    if (error instanceof Error) {
      throw new Error(`画像の圧縮または変換に失敗しました: ${error.message}`)
    }
    throw new Error('画像の圧縮または変換に失敗しました')
  }
}

// Web Crypto API を使用した暗号化/復号化関数（非同期、より安全）
// ただし、ブラウザ環境のみで動作します。

// 文字列を暗号化する関数
export async function encryptString(text: string, secret: string): Promise<string> {
  // ブラウザ環境かつWeb Crypto APIが利用可能かチェック
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API is not available in this environment.')
  }

  try {
    // パスワードからキーを生成
    // 注意: 本番環境では、秘密鍵自体をソースコードに含めるべきではありません。
    // 安全な方法（環境変数など）で管理し、サーバーサイドでの暗号化/復号化を推奨します。
    // クライアントサイドでの秘密鍵使用はセキュリティリスクを伴います。
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    )

    // ランダムなソルトとIVを生成
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const iv = crypto.getRandomValues(new Uint8Array(12)) // GCMには12バイトが推奨

    // 派生キーを生成
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000, // 十分な繰り返し回数
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 }, // 256ビットキー
      false,
      ['encrypt', 'decrypt']
    )

    // テキストを暗号化
    const encodedText = new TextEncoder().encode(text)
    const encryptedBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encodedText)

    // 暗号化されたデータとIV、ソルトを結合して保存
    // Base64に変換して文字列として扱う
    const encryptedArray = new Uint8Array(encryptedBuffer)
    // ソルト(16) + IV(12) + 暗号文
    const resultBuffer = new Uint8Array(salt.length + iv.length + encryptedArray.length)
    resultBuffer.set(salt, 0)
    resultBuffer.set(iv, salt.length)
    resultBuffer.set(encryptedArray, salt.length + iv.length)

    // Base64に変換して返す
    // btoa はバイナリデータをBase64文字列に変換するが、入力は文字列である必要があるため、
    // Uint8ArrayをString.fromCharCodeを使って文字列に変換する
    return btoa(String.fromCharCode(...resultBuffer))
  } catch (error) {
    console.error('文字列暗号化エラー:', error)
    if (error instanceof Error) {
      throw new Error(`文字列の暗号化に失敗しました: ${error.message}`)
    }
    throw new Error('文字列の暗号化に失敗しました')
  }
}

// 暗号化された文字列を復号する関数
export async function decryptString(encryptedText: string, secret: string): Promise<string> {
  // ブラウザ環境かつWeb Crypto APIが利用可能かチェック
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API is not available in this environment.')
  }

  try {
    // Base64からバイナリデータ（Uint8Array）に復元
    const dataBuffer = new Uint8Array(
      atob(encryptedText) // Base64デコード
        .split('')
        .map((char) => char.charCodeAt(0)) // 各文字コードを数値配列に
    )

    // 最小限のデータ長チェック (ソルト16 + IV12 = 28バイト)
    if (dataBuffer.length < 28) {
      throw new Error('無効な暗号化データ長です。')
    }

    // ソルト、IV、暗号文を分離
    const salt = dataBuffer.slice(0, 16)
    const iv = dataBuffer.slice(16, 16 + 12)
    const ciphertext = dataBuffer.slice(16 + 12) // 残りが暗号文

    // パスワードからキーを再生成
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    )

    // 派生キーを再生成
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt, // 保存されたソルトを使用
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    )

    // 復号
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv }, // 保存されたIVを使用
      key,
      ciphertext // 分離した暗号文
    )

    // 復号されたテキストを返す
    return new TextDecoder().decode(decryptedBuffer)
  } catch (error) {
    console.error('文字列復号化エラー:', error)
    if (error instanceof Error) {
      // 復号化失敗の一般的なエラーメッセージを返す（セキュリティのため詳細なエラーは出さない）
      throw new Error(`文字列の復号化に失敗しました: ${error.message}`)
    }
    throw new Error('文字列の復号化に失敗しました')
  }
}

// CryptoJS を使用した暗号化/復号化関数（同期、ブラウザ/Node.js 両方で動作可能）
// Web Crypto API より手軽ですが、PBKDF2の繰り返し回数などセキュリティ設定に注意が必要です。

// 文字列を暗号化する関数 (CryptoJS版)
export function encryptStringCryptoJS(text: string, secret: string): string {
  if (!secret) {
    console.warn('Cookie暗号化キーが設定されていません。暗号化せずに返します。')
    return text // シークレットがない場合はそのまま返す
  }
  try {
    const ciphertext = CryptoJS.AES.encrypt(text, secret).toString()
    return ciphertext
  } catch (error) {
    console.error('CryptoJS 暗号化エラー:', error)
    if (error instanceof Error) {
      throw new Error(`CryptoJSでの文字列暗号化に失敗しました: ${error.message}`)
    }
    throw new Error('CryptoJSでの文字列暗号化に失敗しました')
  }
}

// 暗号化された文字列を復号する関数 (CryptoJS版)
export function decryptStringCryptoJS(encryptedText: string, secret: string): string | null {
  if (!secret) {
    console.warn('Cookie暗号化キーが設定されていません。復号化せずに返します。')
    return encryptedText // シークレットがない場合はそのまま返す
  }
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedText, secret)
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8)
    // 復号結果が空文字になる場合がある（パスワード違いなど）
    if (decryptedData === '') {
      console.warn(
        'CryptoJS 復号化結果が空文字です。パスワードが一致しないかデータが壊れている可能性があります。'
      )
      return null // 復号失敗とみなす
    }
    return decryptedData
  } catch (error) {
    console.warn('CryptoJS 復号化エラー:', error)
    // 復号に失敗した場合はnullなどを返すことで、呼び出し元で判断できるようにする
    return null
  }
}

export function generateReferralCode() {
  // ランダムな文字列を生成。衝突の可能性は低いがゼロではない。
  // より確実にユニークなコードが必要な場合は、UUIDなど別の方法を検討。
  // Math.random().toString(36) は "0." + ランダムな文字列 を返す
  // substring(2, 15) で "0." を除き、13文字を取得
  return Math.random().toString(36).substring(2, 15).toLowerCase()
}

// セッション秘密鍵 (環境変数から取得)
// クライアントサイドに秘密鍵を置くのはセキュリティリスクがあるため、注意が必要です。
// サーバーサイドでの処理（APIルートなど）を推奨します。
const SESSION_SECRET = process.env.NEXT_PUBLIC_COOKIE_SECRET || ''

export const setCookie = (name: string, value: string, days: number) => {
  // クライアントサイド (ブラウザ) 環境でのみ実行
  if (typeof document === 'undefined') {
    console.warn('setCookieはブラウザ環境でのみ実行可能です。')
    return
  }

  try {
    let cookieValue = value

    // シークレットキーが設定されていれば暗号化
    if (SESSION_SECRET) {
      try {
        // CryptoJSで暗号化
        cookieValue = encryptStringCryptoJS(value, SESSION_SECRET)
      } catch (error) {
        console.error('Cookie暗号化中にエラーが発生しました。平文で保存します。', error)
        // 暗号化に失敗した場合、平文のvalueを使用する
        cookieValue = value
      }
    } else {
      console.warn(
        'Cookie暗号化キー(NEXT_PUBLIC_COOKIE_SECRET)が設定されていません。平文で保存します。'
      )
    }

    // **値をURIエンコードする** <-- ここが修正点
    const encodedValue = encodeURIComponent(cookieValue)

    const expiresDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    const expires = expiresDate.toUTCString()

    // secure フラグを本番環境でのみつけるように修正
    const secureFlag = process.env.NODE_ENV === 'production' ? 'secure;' : ''
    // httpOnly は JavaScript では設定できません。サーバーサイドで設定する必要があります。

    document.cookie = `${name}=${encodedValue}; expires=${expires}; path=/; ${secureFlag}SameSite=Lax` // SameSite属性を追加することを推奨

    console.log('document.cookie', document.cookie)
    console.log(`クッキー "${name}" を保存しました。期限: ${expires}`)
  } catch (error) {
    console.error('クッキーの保存中にエラーが発生しました:', error)
    // 最終的なフォールバックとして、非エンコードの平文を試す（通常は不要だが安全側で）
    try {
      const expiresDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
      const expires = expiresDate.toUTCString()
      const secureFlag = process.env.NODE_ENV === 'production' ? 'secure;' : ''
      document.cookie = `${name}=${value}; expires=${expires}; path=/; ${secureFlag}SameSite=Lax`
      console.warn(`クッキー "${name}" をエンコードせずに保存しました (フォールバック)。`)
    } catch (e) {
      console.error('クッキーのフォールバック保存も失敗しました:', e)
    }
  }
}

export const getCookie = (name: string) => {
  // クライアントサイド (ブラウザ) 環境でのみ実行
  if (typeof document === 'undefined') {
    // console.warn('getCookieはブラウザ環境でのみ実行可能です。'); // 頻繁に出力される可能性があるのでコメントアウト
    return null
  }

  try {
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)

    if (parts.length === 2) {
      const rawValue = parts.pop()?.split(';').shift()
      if (!rawValue) {
        console.log(`クッキー "${name}" の値が空です。`)
        return null // 値が空の場合はnullを返す
      }

      // **値をURIデコードする** <-- ここが修正点
      let decodedValue: string
      try {
        decodedValue = decodeURIComponent(rawValue)
      } catch (decodeError) {
        console.error(
          `クッキー "${name}" のURIデコードに失敗しました。元の値をそのまま使用します。`,
          decodeError
        )
        decodedValue = rawValue // デコード失敗時は元の値を使う
      }

      // シークレットキーが設定されていない場合
      if (!SESSION_SECRET) {
        console.warn('Cookie暗号化キーが設定されていません。平文として処理します。')
        return decodedValue // デコードした値をそのまま返す
      }

      // 暗号化されたデータとして復号を試みる
      const decryptedData = decryptStringCryptoJS(decodedValue, SESSION_SECRET)

      // 正常に復号できた場合 (null以外)
      if (decryptedData !== null) {
        return decryptedData
      } else {
        // 復号に失敗した場合、元のデコードされた値を平文として返す
        console.warn(`クッキー "${name}" の復号に失敗しました。平文として処理します。`)
        return decodedValue // 復号失敗時はデコードした平文を返す
      }
    }
    // クッキーが見つからなかった場合
    // console.log(`クッキー "${name}" が見つかりませんでした。`); // 頻繁に出力される可能性があるのでコメントアウト
    return null
  } catch (error) {
    console.error(`クッキー "${name}" の取得中にエラーが発生しました:`, error)
    return null
  }
}

export const deleteCookie = (name: string) => {
  // クライアントサイド (ブラウザ) 環境でのみ実行
  if (typeof document === 'undefined') {
    console.warn('deleteCookieはブラウザ環境でのみ実行可能です。')
    return
  }

  // 期限を過去の日付に設定することで削除
  const secureFlag = process.env.NODE_ENV === 'production' ? 'secure;' : ''
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; ${secureFlag}SameSite=Lax` // SameSite属性も合わせて設定
  console.log(`クッキー "${name}" を削除しました。`)
}