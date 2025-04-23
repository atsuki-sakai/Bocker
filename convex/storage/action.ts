'use node';

import { action } from '../_generated/server';
import { v } from 'convex/values';
import { gcsService } from '@/services/gcp/cloud_storage/GoogleStorageService';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { imgDirectoryType } from '@/services/convex/shared/types/common';
import { throwConvexError } from '@/lib/error';
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
      throw throwConvexError({
        message: 'ファイル名が指定されていません',
        status: 400,
        code: 'INVALID_ARGUMENT',
        callFunc: 'storage.upload',
        title: 'ファイル名が指定されていません',
        severity: 'low',
        details: { ...args },
      });
    }

    if (!args.contentType) {
      throw throwConvexError({
        message: 'ファイルタイプが指定されていません',
        status: 400,
        code: 'INVALID_ARGUMENT',
        callFunc: 'storage.upload',
        title: 'ファイルタイプが指定されていません',
        severity: 'low',
        details: { ...args },
      });
    }

    // Base64データをデコードしてバッファに変換
    const binaryData = Buffer.from(args.base64Data, 'base64');

    if (binaryData.length === 0) {
      throw throwConvexError({
        message: 'ファイルデータが空です',
        status: 400,
        code: 'INVALID_ARGUMENT',
        callFunc: 'storage.upload',
        title: 'ファイルデータが空です',
        severity: 'low',
        details: { ...args },
      });
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
      throw throwConvexError({
        message: 'ファイルの削除に失敗しました',
        status: 400,
        code: 'INVALID_ARGUMENT',
        callFunc: 'storage.kill',
        title: 'ファイルの削除に失敗しました',
        severity: 'low',
        details: { ...args },
      });
    }
  },
});
