import { NextRequest, NextResponse } from 'next/server'
import { imageService } from '@/services/image/ImageService'
import { Id } from '@/convex/_generated/dataModel'
import { ImageDirectory, ImageQuality, ProcessedImageResult } from '@/services/image/image.types'

// 単数アップロード用のリクエストボディ型
interface SingleUploadRequestBody {
  base64Data: string;
  fileName: string;
  directory: ImageDirectory;
  salonId: Id<'salon'>;
  quality?: ImageQuality;
}

// 複数アップロード用のリクエストボディ型
interface BulkUploadRequestBodyItem {
  base64Data: string;
  fileName: string;
  directory: ImageDirectory;
  salonId: Id<'salon'>;
  quality?: ImageQuality;
  isHotSpot?: boolean;
}
type BulkUploadRequestBody = BulkUploadRequestBodyItem[];


export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();

  // bodyが配列かどうかで処理を分岐
  if (Array.isArray(body)) {
    // 複数アップロード処理
    const items = body as BulkUploadRequestBody;
    if (items.length === 0) {
      return NextResponse.json({ error: 'アップロードする画像データがありません。' }, { status: 400 });
    }

    try {
      const uploadPromises = items.map(item =>
        imageService.uploadImageWithThumbnail(
          item.base64Data,
          item.fileName,
          item.directory,
          item.salonId,
          item.quality,
          item.isHotSpot
        )
      );

      // Promise.allSettledで全てのプロミスが解決するのを待つ
      const results = await Promise.allSettled(uploadPromises);

      const successfulUploads: ProcessedImageResult[] = [];
      const failedUploadsInfo: {fileName: string, error: string}[] = [];
      let hasFailure = false;

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successfulUploads.push(result.value);
        } else {
          hasFailure = true;
          // エラー詳細をログに出力
          console.error(`Failed to upload ${items[index].fileName}:`, result.reason);
          failedUploadsInfo.push({
            fileName: items[index].fileName,
            error: result.reason instanceof Error ? result.reason.message : String(result.reason)
          });
        }
      });

      if (hasFailure) {
        // 失敗があった場合、成功した画像を削除 (ロールバック)
        for (const uploaded of successfulUploads) {
          try {
            await imageService.deleteImageWithThumbnail(uploaded.imgUrl);
          } catch (deleteErr) {
            console.error(`Failed to delete image ${uploaded.imgUrl} during rollback:`, deleteErr);
          }
        }
        return NextResponse.json({
          error: '一部の画像のアップロードに失敗しました。すべての処理がロールバックされました。',
          details: failedUploadsInfo
        }, { status: 500 });
      }

      return NextResponse.json({ successfulUploads });

    } catch (error) { // これは主に imageService の外での予期せぬエラー
      console.error('Bulk image upload processing error:', error);
      return NextResponse.json({ error: '一括画像アップロード処理中に予期せぬエラーが発生しました。' }, { status: 500 });
    }

  } else {
    // 単数アップロード処理 (既存のロジックを流用)
    const { base64Data, fileName, directory, salonId, quality } = body as SingleUploadRequestBody;
    if (!base64Data || !fileName || !directory || !salonId) {
      return NextResponse.json({ error: '必要なパラメータが不足しています。' }, { status: 400 })
    }
    try {
      const result = await imageService.uploadImageWithThumbnail(base64Data, fileName, directory, salonId, quality);
      return NextResponse.json(result);
    } catch (error) {
      console.error('Single image upload error:', error);
      // ImageServiceErrorなど、カスタムエラーの情報をより詳細に返すことも検討
      const errorMessage = error instanceof Error ? error.message : '画像のアップロードに失敗しました。';
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();

  // imgUrl (単数) と imgUrls (複数) の両方に対応できるようにする
  const { imgUrl, imgUrls, withThumbnail } = body;

  if (!imgUrl && (!Array.isArray(imgUrls) || imgUrls.length === 0)) {
    return NextResponse.json({ error: '画像URLが指定されていません。単数の場合は imgUrl、複数の場合は imgUrls を配列で指定してください。' }, { status: 400 });
  }

  try {
    let urlsToDelete: string[] = [];
    if (imgUrl) {
      urlsToDelete.push(imgUrl);
    } else if (imgUrls) {
      urlsToDelete = imgUrls;
    }

    const deletePromises = urlsToDelete.map(url => {
      if (withThumbnail) {
        return imageService.deleteImageWithThumbnail(url);
      } else {
        return imageService.deleteImage(url);
      }
    });

    const results = await Promise.allSettled(deletePromises);

    const successfulDeletes: string[] = [];
    const failedDeletes: { url: string; error: string }[] = [];
    let hasFailure = false;

    results.forEach((result, index) => {
      const currentUrl = urlsToDelete[index];
      if (result.status === 'fulfilled') {
        successfulDeletes.push(currentUrl);
      } else {
        hasFailure = true;
        const errorMessage = result.reason instanceof Error ? result.reason.message : String(result.reason);
        failedDeletes.push({ url: currentUrl, error: errorMessage });
        console.error(`Failed to delete image ${currentUrl}:`, result.reason);
      }
    });

    if (hasFailure) {
      if (successfulDeletes.length === 0) {
        // 全て失敗した場合
        return NextResponse.json({
          error: 'すべての画像の削除に失敗しました。',
          details: failedDeletes,
        }, { status: 500 });
      }
      // 一部失敗した場合
      return NextResponse.json({
        message: '一部の画像の削除に失敗しました。',
        successfulDeletes,
        failedDeletes,
      }, { status: 207 }); // Multi-Status
    }

    return NextResponse.json({ success: true, message: `${urlsToDelete.length}件の画像を削除しました。`, deletedUrls: successfulDeletes });

  } catch (error) { // これは主に imageService の外での予期せぬエラーやリクエストボディのパースエラー
    console.error('Image delete processing error:', error);
    const errorMessage = error instanceof Error ? error.message : '画像削除処理中に予期せぬエラーが発生しました。';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
