'use node';

import { action } from '../_generated/server';
import { v } from 'convex/values';
import { gcsService } from '@/services/gcp/cloud_storage/GoogleStorageService';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { imgDirectoryType } from '@/services/convex/shared/types/common';
import { StorageError } from '@/services/convex/shared/utils/error';
import { validateRequired } from '@/services/convex/shared/utils/validation';

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
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    // ファイル名とMIMEタイプの検証
    if (!args.filePath) {
      const err = new StorageError(
        'low',
        'ファイル名が指定されていません',
        'INVALID_ARGUMENT',
        400,
        {
          ...args,
        }
      );
      throw err;
    }

    if (!args.contentType) {
      const err = new StorageError(
        'low',
        'ファイルタイプが指定されていません',
        'INVALID_ARGUMENT',
        400,
        {
          ...args,
        }
      );
      throw err;
    }

    // Base64データをデコードしてバッファに変換
    const binaryData = Buffer.from(args.base64Data, 'base64');

    if (binaryData.length === 0) {
      const err = new StorageError('low', 'ファイルデータが空です', 'INVALID_ARGUMENT', 400, {
        ...args,
      });
      throw err;
    }
    // GCSにアップロード - Fileオブジェクトを使わずに直接バッファを渡す
    return await gcsService.uploadFileBuffer(
      binaryData,
      args.filePath,
      args.contentType,
      args.directory
    );
  },
});

export const kill = action({
  args: {
    // 削除するファイルのURL
    imgUrl: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.imgUrl, 'imgUrl');
    try {
      await gcsService.deleteImage(args.imgUrl);
      return { success: true };
    } catch (error) {
      const err = new StorageError('low', 'ファイルの削除に失敗しました', 'INVALID_ARGUMENT', 400, {
        ...args,
      });
      throw err;
    }
  },
});
