'use node';

import { action } from '../_generated/server';
import { v } from 'convex/values';
import { gcsService } from '@/services/gcp/cloud_storage/GoogleStorageService';
import { checkAuth } from '@/convex/utils/auth';
import { imgDirectoryType, imageQualityType } from '@/convex/types';
import { ConvexError } from 'convex/values';
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants';

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
    // サロンID
    tenantId: v.id('tenant'),
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
        args.tenantId
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
    tenantId: v.id('tenant'),
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
        args.tenantId,
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
