'use node';

import { action } from '../_generated/server';
import { v } from 'convex/values';
import { gcsService } from '@/services/gcp/cloud_storage/GoogleStorageService';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { imgDirectoryType } from '@/services/convex/shared/types/common';
import { throwConvexError } from '@/lib/error';
import sharp from 'sharp';

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
    salonId: v.id('salon'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
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
      })
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
      })
    }

    // Base64データをデコードしてバッファに変換
    const binaryData = Buffer.from(args.base64Data, 'base64')

    if (binaryData.length === 0) {
      throw throwConvexError({
        message: 'ファイルデータが空です',
        status: 400,
        code: 'INVALID_ARGUMENT',
        callFunc: 'storage.upload',
        title: 'ファイルデータが空です',
        severity: 'low',
        details: { ...args },
      })
    }
    // GCSにアップロード - Fileオブジェクトを使わずに直接バッファを渡す
    return await gcsService.uploadFileBuffer(
      binaryData,
      args.filePath,
      args.contentType,
      args.directory,
      args.salonId
    )
  },
})

export const uploadWithThumbnail = action({
  args: {
    base64Data: v.string(),
    fileName: v.string(),
    directory: v.union(v.literal('option'), v.literal('menu'), v.literal('setting') , v.literal('staff'), v.literal('customer'), v.literal('carte')),
    salonId: v.id('salon'),
    quality: v.optional(v.union(v.literal("low"), v.literal("high"))),
  },
  returns: v.object({
    imgUrl: v.string(),
    thumbnailUrl: v.string(),
  }),
  handler: async (ctx, args) => {
    checkAuth(ctx)
    let originalResultUrl: string | undefined = undefined
    let thumbnailResultUrl: string | undefined = undefined

    try {
      const imageBuffer = Buffer.from(args.base64Data, 'base64');
      if (imageBuffer.length === 0) {
        throw throwConvexError({
          message: 'ファイルデータが空です',
          status: 400,
          code: 'INVALID_ARGUMENT',
          callFunc: 'storage.uploadWithThumbnail',
          title: 'ファイルデータが空です',
          severity: 'low',
          details: { fileName: args.fileName },
        })
      }

      // 圧縮設定（共通）
      const compressImage = async (
        inputBuffer: Buffer,
        maxWidth: number,
        compressionQuality: number,
        targetFormat: 'avif' | 'webp'
      ): Promise<Buffer> => {
        const sharpInstance = sharp(inputBuffer).withMetadata(); // メタデータ削除
        const metadata = await sharpInstance.metadata();

        if (metadata.width && metadata.width > maxWidth) {
          sharpInstance.resize({ width: maxWidth, withoutEnlargement: true });
        }

        if (targetFormat === 'avif') {
          return await sharpInstance.avif({ quality: compressionQuality, effort: 4 }).toBuffer();
        } else {
          return await sharpInstance.webp({ quality: compressionQuality }).toBuffer();
        }
      };

      // 画像フォーマットと拡張子指定
      const activeFormat: "webp" | "avif" = 'webp'; // デフォルトはWebP
      const extension = activeFormat === 'webp' ? '.webp' : '.avif';

      // args.quality に基づいて具体的な品質数値を決定
      // これらの値は期待するファイルサイズに応じて調整してください
      const originalQualityValue = args.quality === "low" ? 40 : 60; // 例: low=40, high=60
      const originalWidth = args.quality === "low" ? 980 : 1920 // オリジナル画像の幅
      // オリジナル画像処理
      const originalBuffer = await compressImage(imageBuffer, originalWidth, originalQualityValue, activeFormat);

      
      const thumbnailQualityValue = args.quality === "low" ? 30 : 50; // 例: low=30, high=50
      const thumbnailWidth = args.quality === "low" ? 180 : 360 // サムネイルの幅
      // サムネイル画像処理
      const thumbnailBuffer = await compressImage(imageBuffer, thumbnailWidth, thumbnailQualityValue, activeFormat);


      if (originalBuffer.length === 0 || thumbnailBuffer.length === 0) {
        throw throwConvexError({
          message: '画像圧縮後のバッファが空です',
          status: 500,
          code: 'INTERNAL_ERROR',
          callFunc: 'storage.uploadWithThumbnail',
          title: '画像圧縮失敗',
          severity: 'high',
          details: { fileName: args.fileName },
        });
      }

      // 拡張子を変換
      const compressedFileName = args.fileName.replace(/\.[^/.]+$/, "") + extension;

      // GCSにアップロード（MIMEタイプも変更）
      const mimeType = activeFormat === 'webp' ? 'image/webp' : 'image/avif';
      const [originalUploadResult, thumbnailUploadResult] = await Promise.all([
        gcsService.uploadFileBuffer(
          originalBuffer,
          compressedFileName,
          mimeType,
          args.directory + '/original',
          args.salonId
        ),
        gcsService.uploadFileBuffer(
          thumbnailBuffer,
          compressedFileName,
          mimeType,
          args.directory + '/thumbnail',
          args.salonId
        ),
      ]);

      originalResultUrl = originalUploadResult.publicUrl;
      thumbnailResultUrl = thumbnailUploadResult.publicUrl;

      return {
        imgUrl: originalResultUrl,
        thumbnailUrl: thumbnailResultUrl,
      };
    } catch (err) {
      // 画像アップロード中にエラーが発生した場合、アップロード済みの画像を削除
      if (originalResultUrl) {
        try {
          await gcsService.deleteImage(originalResultUrl);
        } catch (deleteErr) {
          console.error('Failed to delete original image during error handling:', deleteErr);
        }
      }

      if (thumbnailResultUrl) {
        try {
          await gcsService.deleteImage(thumbnailResultUrl);
        } catch (deleteErr) {
          console.error('Failed to delete thumbnail image during error handling:', deleteErr);
        }
      }

      // エラーを再スローするか、適切なエラーオブジェクトを返す
      if (err instanceof Error && 'message' in err && 'status' in err && 'code' in err) {
        throw err; // 既に throwConvexError 形式の場合
      } else {
        throw throwConvexError({
            message: '画像処理またはアップロード中にエラーが発生しました',
            status: 500,
            code: 'INTERNAL_ERROR',
            callFunc: 'storage.uploadWithThumbnail',
            title: '画像処理エラー',
            severity: 'high',
            details: { error: err instanceof Error ? err.message : String(err), fileName: args.fileName },
        });
      }
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
    try {
      await gcsService.deleteImageWithThumbnail(args.imgUrl)
      return { success: true }
    } catch (error) {
      throw error
    }
  },
})
