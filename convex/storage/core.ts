'use node';

import { action } from '../_generated/server';
import { v } from 'convex/values';
import { GoogleStorageService } from '@/services/gcp/cloud_storage/GoogleStorageService';
import { handleConvexApiError } from '../helpers';
import { ERROR_CODES } from '../errors';
import { ImgDirectoryType } from '../types';

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
    try {
      // Base64データをデコードしてバッファに変換
      const binaryData = Buffer.from(args.base64Data, 'base64');

      // Fileオブジェクトを作成
      const file = new File([binaryData], args.filePath, {
        type: args.contentType,
      });

      // GCSにアップロード
      return await gcsClient.uploadFile(file, args.directory);
    } catch (error) {
      console.error('画像のアップロードに失敗しました', error);
      handleConvexApiError('画像のアップロードに失敗しました', ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

/**
 * Google Cloud Storageからファイルを削除するaction
 */
export const deleteImage = action({
  args: {
    // 削除するファイルのパス
    filename: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      await gcsClient.deleteFile(args.filename);
    } catch (error) {
      console.error('画像の削除に失敗しました', error);
      handleConvexApiError('画像の削除に失敗しました', ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

/**
 * Google Cloud Storageからファイルの公開URLを取得するaction
 */
export const getImageUrl = action({
  args: {
    // ファイルのパス
    filename: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      return await gcsClient.getPublicUrl(args.filename);
    } catch (error) {
      console.error('画像URLの取得に失敗しました', error);
      handleConvexApiError('画像URLの取得に失敗しました', ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});
