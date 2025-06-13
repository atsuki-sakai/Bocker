/**
 * クライアントサイド用CDNユーティリティ
 * GoogleStorageServiceのCDN機能をクライアントで使用可能にする
 */

/**
 * GCS URLをCDN URLに変換する（クライアントサイド用）
 * @param gcsUrl - GCSの直接URL（例: https://storage.googleapis.com/bucket/path/to/image.webp）
 * @returns CDN経由のURL
 */
export function getCdnUrl(gcsUrl: string | null | undefined): string {
  // 空文字列、null、undefinedの場合はそのまま返す
  if (!gcsUrl) return '';
  
  // 環境変数からCDNのベースURLを取得
  const cdnBaseUrl = process.env.NEXT_PUBLIC_CDN_DOMAIN;
  
  // CDNが設定されていない場合はGCS URLをそのまま返す（フォールバック）
  if (!cdnBaseUrl) {
    return gcsUrl;
  }
  
  try {
    // GCS URLをパース
    const url = new URL(gcsUrl);
    
    // storage.googleapis.com のURLでない場合はそのまま返す
    if (url.hostname !== 'storage.googleapis.com') {
      return gcsUrl;
    }
    
    // パスからバケット名を除去（最初のセグメントがバケット名）
    const pathSegments = url.pathname.split('/').filter(segment => segment);
    if (pathSegments.length < 2) {
      return gcsUrl; // 不正なパスの場合はそのまま返す
    }
    
    // バケット名を除いたパスを構築
    const pathWithoutBucket = pathSegments.slice(1).join('/');
    
    // CDN URLを構築
    return `${cdnBaseUrl}/${pathWithoutBucket}`;
  } catch (error) {
    console.warn('[CDN] URL変換エラー:', error, { gcsUrl });
    // エラーの場合は元のURLを返す
    return gcsUrl;
  }
}

/**
 * CDNが有効かどうかを確認する（クライアントサイド用）
 * @returns CDNが有効な場合true
 */
export function isCdnEnabled(): boolean {
  return !!process.env.NEXT_PUBLIC_CDN_DOMAIN;
}