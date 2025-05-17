import sharp from 'sharp';
import { Id } from '@/convex/_generated/dataModel';
import { gcsService } from '@/services/gcp/cloud_storage/GoogleStorageService';
import type { ImageDirectory, ImageQuality, ProcessedImageResult, UploadedFileResult } from './image.types';
import { EmptyFileError, ImageProcessingError, ImageUploadError, ImageServiceError } from './image.errors';
import { ConvexError } from 'convex/values';

// サーバーサイドのみで稼働する
export class ImageService {
  private readonly activeFormat: "webp" | "avif" = 'webp';
  private readonly extension = this.activeFormat === 'webp' ? '.webp' : '.avif';
  private readonly mimeType = this.activeFormat === 'webp' ? 'image/webp' : 'image/avif';

  constructor() {}

  private async compressImage(
    inputBuffer: Buffer,
    maxWidth: number,
    compressionQuality: number,
  ): Promise<Buffer> {
    try {
      const sharpInstance = sharp(inputBuffer).withMetadata(); // メタデータ削除
      const metadata = await sharpInstance.metadata();

      if (metadata.width && metadata.width > maxWidth) {
        sharpInstance.resize({ width: maxWidth, withoutEnlargement: true });
      }

      if (this.activeFormat === 'avif') {
        return await sharpInstance.avif({ quality: compressionQuality, effort: 4 }).toBuffer();
      } else {
        return await sharpInstance.webp({ quality: compressionQuality }).toBuffer();
      }
    } catch (error) {
      throw new ImageProcessingError(undefined, error instanceof Error ? error : new Error(String(error)));
    }
  }

  private getCompressionSettings(quality?: ImageQuality) {
    const originalQualityValue = quality === "low" ? 40 : 75;
    const originalWidth = quality === "low" ? 920 : 1920;
    const thumbnailQualityValue = quality === "low" ? 30 : 50;
    const thumbnailWidth = quality === "low" ? 180 : 360;
    return { originalQualityValue, originalWidth, thumbnailQualityValue, thumbnailWidth };
  }

  async uploadOriginalImage(
    base64Data: string,
    filePath: string,
    contentType: string,
    directory: string, // gcsServiceのdirectoryはstring型
    salonId: Id<'salon'>,
  ): Promise<UploadedFileResult> {
    const binaryData = Buffer.from(base64Data, 'base64');
    if (binaryData.length === 0) {
      throw new EmptyFileError(filePath);
    }

    try {
      return await gcsService.uploadFileBuffer(
        binaryData,
        filePath,
        contentType,
        directory,
        salonId
      );
    } catch (error) {
        // gcsService.uploadFileBuffer は ConvexError をスローする可能性がある
        if (error instanceof ConvexError) throw error;
        throw new ImageUploadError(filePath, error instanceof Error ? error : new Error(String(error)));
    }
  }


  async uploadImageWithThumbnail(
    base64Data: string,
    fileName: string,
    directory: ImageDirectory,
    salonId: Id<'salon'>,
    quality?: ImageQuality,
  ): Promise<ProcessedImageResult> {
    const imageBuffer = Buffer.from(base64Data, 'base64');
    if (imageBuffer.length === 0) {
      throw new EmptyFileError(fileName);
    }

    const { originalQualityValue, originalWidth, thumbnailQualityValue, thumbnailWidth } = this.getCompressionSettings(quality);

    let originalUploadResult: UploadedFileResult | undefined = undefined;
    let thumbnailUploadResult: UploadedFileResult | undefined = undefined;

    try {
      const originalBuffer = await this.compressImage(imageBuffer, originalWidth, originalQualityValue);
      const thumbnailBuffer = await this.compressImage(imageBuffer, thumbnailWidth, thumbnailQualityValue);

      if (originalBuffer.length === 0 || thumbnailBuffer.length === 0) {
        throw new ImageProcessingError(fileName, new Error('Compressed buffer is empty'));
      }

      const safeOriginalName = fileName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_.-]/g, '_');
      const timestamp = Date.now();
      const uniqueFileName = `${timestamp}_${safeOriginalName}${this.extension}`;

      const [originalResult, thumbnailResult] = await Promise.all([
        gcsService.uploadFileBuffer(
          originalBuffer,
          uniqueFileName,
          this.mimeType,
          `${directory}/original`,
          salonId
        ),
        gcsService.uploadFileBuffer(
          thumbnailBuffer,
          uniqueFileName,
          this.mimeType,
          `${directory}/thumbnail`,
          salonId
        ),
      ]);
      originalUploadResult = originalResult;
      thumbnailUploadResult = thumbnailResult;

      return {
        imgUrl: originalUploadResult.publicUrl,
        thumbnailUrl: thumbnailUploadResult.publicUrl,
      };
    } catch (error) {
      // エラー発生時、アップロード済みのファイルを削除する試み
      if (originalUploadResult?.publicUrl) {
        try {
          await gcsService.deleteImage(originalUploadResult.publicUrl);
        } catch (deleteErr) {
          console.error('Failed to delete original image during error handling:', deleteErr);
        }
      }
      if (thumbnailUploadResult?.publicUrl) {
        try {
          await gcsService.deleteImage(thumbnailUploadResult.publicUrl);
        } catch (deleteErr) {
          console.error('Failed to delete thumbnail image during error handling:', deleteErr);
        }
      }
      if (error instanceof ConvexError || error instanceof ImageServiceError) {
        throw error;
      }
      throw new ImageUploadError(fileName, error instanceof Error ? error : new Error(String(error)));
    }
  }

  async deleteImage(imgUrl: string): Promise<void> {
    try {
      await gcsService.deleteImage(imgUrl);
    } catch (error) {
        if (error instanceof ConvexError) throw error;
        // gcsService.deleteImage は ConvexError をスローするので、ここでは一般的なエラーとしてラップしない方が良いかもしれない
        // しかし、一貫性のために ImageServiceError でラップする選択肢もある
        const serviceError = new ImageServiceError({
            message: 'GCSからの画像削除に失敗しました',
            status: 500,
            code: 'INTERNAL_ERROR',
            callFunc: 'ImageService.deleteImage',
            title: '画像削除失敗',
            severity: 'medium',
            details: { imgUrl, error: error instanceof Error ? error.message : String(error) }
        });
        console.error(serviceError); // ログには詳細を出す
        throw serviceError; // action層でキャッチして throwConvexError する
    }
  }

  async deleteImageWithThumbnail(imgUrl: string): Promise<void> {
    try {
      await gcsService.deleteImageWithThumbnail(imgUrl);
    } catch (error) {
        if (error instanceof ConvexError) throw error;
        const serviceError = new ImageServiceError({
            message: 'GCSからのオリジナル・サムネイル画像削除に失敗しました',
            status: 500,
            code: 'INTERNAL_ERROR',
            callFunc: 'ImageService.deleteImageWithThumbnail',
            title: '画像削除失敗',
            severity: 'medium',
            details: { imgUrl, error: error instanceof Error ? error.message : String(error) }
        });
        console.error(serviceError);
        throw serviceError;
    }
  }
}

export const imageService = new ImageService(); 