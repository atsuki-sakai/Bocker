'use node';

import { action } from '../_generated/server';
import { v } from 'convex/values';
import { GoogleStorageService } from '@/services/gcp/cloud_storage/GoogleStorageService';
import { handleConvexApiError } from '../helpers';
import { ERROR_CODES } from '../errors';
import { ImgDirectoryType } from '../types';
import { STORAGE_URL } from '@/services/gcp/cloud_storage/constants';
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
      // ファイル名とMIMEタイプの検証
      if (!args.filePath) {
        handleConvexApiError('ファイル名が指定されていません', ERROR_CODES.VALIDATION_ERROR);
        return { error: 'ファイル名が指定されていません' };
      }

      if (!args.contentType) {
        handleConvexApiError('ファイルタイプが指定されていません', ERROR_CODES.VALIDATION_ERROR);
        return { error: 'ファイルタイプが指定されていません' };
      }

      // Base64データをデコードしてバッファに変換
      const binaryData = Buffer.from(args.base64Data, 'base64');

      if (binaryData.length === 0) {
        handleConvexApiError('ファイルデータが空です', ERROR_CODES.VALIDATION_ERROR);
        return { error: 'ファイルデータが空です' };
      }

      console.log(
        `アップロード処理開始: ファイル=${args.filePath}, タイプ=${args.contentType}, サイズ=${binaryData.length}バイト, ディレクトリ=${args.directory}`
      );

      // GCSにアップロード - Fileオブジェクトを使わずに直接バッファを渡す
      const result = await gcsClient.uploadFileBuffer(
        binaryData,
        args.filePath,
        args.contentType,
        args.directory
      );

      console.log(`アップロード完了: ${result.filePath}`);

      return result;
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
    // 削除するファイルのURL
    imgUrl: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      await gcsClient.deleteImage(args.imgUrl);
      return { success: true };
    } catch (error) {
      console.error('画像の削除に失敗しました', error);
      handleConvexApiError('画像の削除に失敗しました', ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});
