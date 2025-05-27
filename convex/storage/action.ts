'use node';

import { action } from '../_generated/server';
import { v } from 'convex/values';
import { auth } from '@clerk/nextjs/server';
import { gcsService } from '@/services/gcp/cloud_storage/GoogleStorageService';
import { checkAuth } from '@/convex/utils/auth';
import { imgDirectoryType, imageQualityType } from '@/convex/types';
import { ConvexError } from 'convex/values';
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants';

/**
 * バルクアップロード時の最大枚数。
 * 短時間に複数回呼び出されてもサーバー負荷が
 * 急増しないよう、上限を 4 枚に固定する。
 */
const MAX_BULK_UPLOAD_IMAGES = 4 as const;

export const upload = action({
  args: {
    // ファイルデータをBase64でエンコードした文字列
    base64Data: v.string(),
    // ファイルのパス
    filePath: v.string(),
    // ファイルのMIMEタイプ
    contentType: v.string(),
    // 保存先のディレクトリ
    directory: imgDirectoryType,
    // 店舗ID
    orgId: v.id('organization'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    // ファイル名とMIMEタイプの検証
    if (!args.filePath) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.UNPROCESSABLE_ENTITY,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'storage.upload',
        message: 'ファイル名が指定されていません',
        code: 'UNPROCESSABLE_ENTITY',
        status: 400,
        details: {
          ...args,
        },
      });
    }

    if (!args.contentType) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.UNPROCESSABLE_ENTITY,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'storage.upload',
        message: 'ファイルタイプが指定されていません',
        code: 'UNPROCESSABLE_ENTITY',
        status: 400,
        details: {
          ...args,
        },
      });
    }

    // Base64データをデコードしてバッファに変換
    const binaryData = Buffer.from(args.base64Data, 'base64')

    if (binaryData.length === 0) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.UNPROCESSABLE_ENTITY,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'storage.upload',
        message: 'ファイルデータが空です',
        code: 'UNPROCESSABLE_ENTITY',
        status: 400,
        details: {
          ...args,
        },
      });
    }
    try {
    // GCSにアップロード - Fileオブジェクトを使わずに直接バッファを渡す
    return await gcsService.uploadFileBuffer(
      binaryData,
      args.filePath,
      args.contentType,
      args.directory,
      args.orgId
      )
    } catch (error) {
      throw error
    }
  },
})

export const uploadWithThumbnail = action({
  args: {
    base64Data: v.string(),
    fileName: v.string(),
    directory: imgDirectoryType,
    orgId: v.id('organization'),
    quality: imageQualityType,
  },
  returns: v.object({
    imgUrl: v.string(),
    thumbnailUrl: v.string(),
  }),
  handler: async (ctx, args) => {
    checkAuth(ctx)
    if (!args.fileName) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.UNPROCESSABLE_ENTITY,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'storage.uploadWithThumbnail',
        message: 'ファイル名が指定されていません。',
        code: 'UNPROCESSABLE_ENTITY',
        status: 400,
        details: {
          ...args,
        },
      });
    }
    if (!args.base64Data) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.UNPROCESSABLE_ENTITY,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'storage.uploadWithThumbnail',
        message: '画像データ(Base64)が指定されていません。',
        code: 'UNPROCESSABLE_ENTITY',
        status: 400,
        details: {
          ...args,
        },
      });
    }

    try {
      const result = await gcsService.uploadCompressedImageWithThumbnail(
        args.base64Data,
        args.fileName,
        args.directory,
        args.orgId,
        args.quality,
      );
      return result;
    } catch (error) {
      throw error;
    }
  },
})

export const kill = action({
  args: {
    // 削除するファイルのURL
    imgUrl: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    if (!args.imgUrl) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.UNPROCESSABLE_ENTITY,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'storage.kill',
        message: '削除対象の画像URLが指定されていません。',
        code: 'UNPROCESSABLE_ENTITY',
        status: 400,
        details: {
          ...args,
        },
      });
    }
    try {
      await gcsService.deleteImage(args.imgUrl)
      return { success: true }
    } catch (error) {
      throw error
    }
  },
})

export const killWithThumbnail = action({
  args: {
    // 削除するファイルのURL（オリジナル画像のURL）
    imgUrl: v.string(),
  },
  handler: async (ctx, args) => {
    
    checkAuth(ctx)
    if (!args.imgUrl) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.UNPROCESSABLE_ENTITY,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'storage.killWithThumbnail',
        message: '削除対象の画像URLが指定されていません。',
        code: 'UNPROCESSABLE_ENTITY',
        status: 400,
        details: {
          ...args,
        },
      });
    }
    try {
      await gcsService.deleteImageWithThumbnail(args.imgUrl)
      return { success: true }
    } catch (error) {
      throw error
    }
  },
})

// 新しいaction関数: 複数の画像をサムネイル付きで一括アップロード
export const bulkUploadWithThumbnails = action({
  args: {
    // アップロードする画像の配列
    images: v.array(
      v.object({
        // Base64エンコードされた画像データ
        base64Data: v.string(),
        // ファイル名
        fileName: v.string(),
        // 保存先ディレクトリ
        directory: imgDirectoryType,
        // 組織ID
        orgId: v.id('organization'),
        // 画像品質
        quality: imageQualityType,
      })
    ),
  },
  returns: v.object({
    // アップロードに成功した画像の情報
    successfulUploads: v.array(
      v.object({
        imgUrl: v.string(),
        thumbnailUrl: v.string(),
      })
    ),
    // アップロードに失敗した画像の情報
    failedUploads: v.optional(
      v.array(
        v.object({
          fileName: v.string(),
          error: v.string(),
        })
      )
    ),
    // 処理全体のメッセージ
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // 認証チェック
    checkAuth(ctx);

    // 画像データが空でないかチェック
    if (args.images.length === 0) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.UNPROCESSABLE_ENTITY,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'storage.bulkUploadWithThumbnails',
        message: 'アップロードする画像データがありません。',
        code: 'UNPROCESSABLE_ENTITY',
        status: 400,
        details: { ...args },
      });
    }
    if (args.images.length > MAX_BULK_UPLOAD_IMAGES) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.UNPROCESSABLE_ENTITY,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'storage.bulkUploadWithThumbnails',
        message: `一度にアップロードできる画像は最大${MAX_BULK_UPLOAD_IMAGES}枚までです。`,
        code: 'UPLOAD_LIMIT_EXCEEDED',
        status: 400,
        details: { ...args },
      });
    }

    // 各画像アイテムのバリデーション
    for (const image of args.images) {
      if (!image.fileName) {
        throw new ConvexError({
          statusCode: ERROR_STATUS_CODE.UNPROCESSABLE_ENTITY,
          severity: ERROR_SEVERITY.ERROR,
          callFunc: 'storage.bulkUploadWithThumbnails',
          message: 'ファイル名が指定されていない画像があります。',
          code: 'UNPROCESSABLE_ENTITY',
          status: 400,
          details: { ...args },
        });
      }
      if (!image.base64Data) {
        throw new ConvexError({
          statusCode: ERROR_STATUS_CODE.UNPROCESSABLE_ENTITY,
          severity: ERROR_SEVERITY.ERROR,
          callFunc: 'storage.bulkUploadWithThumbnails',
          message: `画像データ(Base64)が指定されていない画像があります: ${image.fileName}`,
          code: 'UNPROCESSABLE_ENTITY',
          status: 400,
          details: { ...args },
        });
      }
    }

    // アップロード結果を格納する配列
    const successfulUploads: { imgUrl: string; thumbnailUrl: string }[] = [];
    const failedUploadsInfo: { fileName: string; error: string }[] = [];

    // 同時実行数を抑えるため逐次処理
    for (const image of args.images) {
      try {
        const uploaded = await gcsService.uploadCompressedImageWithThumbnail(
          image.base64Data,
          image.fileName,
          image.directory,
          image.orgId,
          image.quality,
        );
        successfulUploads.push(uploaded);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        failedUploadsInfo.push({ fileName: image.fileName, error: errorMessage });
        console.error(`Failed to upload ${image.fileName}:`, err);
        break; // 失敗時は残りを処理せずロールバックへ
      }
    }

    // 途中で失敗が発生した場合はロールバック
    if (failedUploadsInfo.length > 0) {
      for (const uploaded of successfulUploads) {
        try {
          await gcsService.deleteImageWithThumbnail(uploaded.imgUrl);
        } catch (deleteErr) {
          console.error(`Rollback deletion failed for ${uploaded.imgUrl}:`, deleteErr);
        }
      }

      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.INTERNAL_SERVER_ERROR,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'storage.bulkUploadWithThumbnails',
        message: '一部の画像のアップロードに失敗したため、すべての処理をロールバックしました。',
        code: 'BULK_UPLOAD_FAILED_AND_ROLLED_BACK',
        status: 500,
        details: { failedUploads: failedUploadsInfo },
      });
    }

    // すべて成功した場合のみ結果を返す
    return {
      successfulUploads,
      message: `${successfulUploads.length}件の画像のアップロードに成功しました。`,
    };
  },
});
