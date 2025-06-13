/**
 * クライアントサイドから画像をアップロードするためのユーティリティ
 */

import { ImageDirectory, ImageQuality } from '@/services/gcp/cloud_storage/types';
import { AspectType } from '@/convex/types';
import { Id } from '@/convex/_generated/dataModel';

interface UploadImageParams {
  base64Data: string;
  fileName: string;
  directory: ImageDirectory;
  orgId: Id<'organization'>;
  aspectType: AspectType;
  quality?: ImageQuality;
  isHotSpot?: boolean;
}

interface UploadImageResult {
  originalUrl: string;
  thumbnailUrl: string;
}

/**
 * 画像をアップロードしてCDN URLを取得
 * @param params アップロードパラメータ
 * @returns オリジナルとサムネイルのCDN URL
 */
export async function uploadCompressedImage(params: UploadImageParams): Promise<UploadImageResult> {
  const response = await fetch('/api/upload/image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '画像のアップロードに失敗しました');
  }

  return response.json();
}