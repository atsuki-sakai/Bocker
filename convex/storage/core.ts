'use node';

import { action } from '../_generated/server';
import { v } from 'convex/values';
import { GoogleStorageService } from '@/services/gcp/cloud_storage/GoogleStorageService';
import { authCheck } from '../helpers';
import { CONVEX_ERROR_CODES } from '../constants';
import { ImgDirectoryType } from '../types';
import { ConvexError } from 'convex/values';

// GCSクライアントのシングルトンインスタンス
const gcsClient = new GoogleStorageService();

/**
 * 画像をGoogle Cloud Storageにアップロードするaction
 */
export const uploadImage = action({
  args: {
    // ファイルデータをBase64でエンコードした文字列
    base64Data: v.string(),
    // ファイルのパス
    filePath: v.string(),
    // ファイルのMIMEタイプ
    contentType: v.string(),
    // 保存先のディレクトリ
    directory: ImgDirectoryType,
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    // ファイル名とMIMEタイプの検証
    if (!args.filePath) {
      console.error('UploadImage: ファイル名が指定されていません', { ...args });
      throw new ConvexError({
        message: 'ファイル名が指定されていません',
        code: CONVEX_ERROR_CODES.VALIDATION_ERROR,
        severity: 'low',
        status: 400,
      });
    }

    if (!args.contentType) {
      console.error('UploadImage: ファイルタイプが指定されていません', { ...args });
      throw new ConvexError({
        message: 'ファイルタイプが指定されていません',
        code: CONVEX_ERROR_CODES.VALIDATION_ERROR,
        severity: 'low',
        status: 400,
      });
    }

    // Base64データをデコードしてバッファに変換
    const binaryData = Buffer.from(args.base64Data, 'base64');

    if (binaryData.length === 0) {
      console.error('UploadImage: ファイルデータが空です', { ...args });
      throw new ConvexError({
        message: 'ファイルデータが空です',
        code: CONVEX_ERROR_CODES.VALIDATION_ERROR,
        severity: 'low',
        status: 400,
      });
    }
    // GCSにアップロード - Fileオブジェクトを使わずに直接バッファを渡す
    return await gcsClient.uploadFileBuffer(
      binaryData,
      args.filePath,
      args.contentType,
      args.directory
    );
  },
});

/**
 * Google Cloud Storageからファイルを削除するaction
 */
export const deleteImage = action({
  args: {
    // 削除するファイルのURL
    imgUrl: v.string(),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    await gcsClient.deleteImage(args.imgUrl);
    return { success: true };
  },
});
