import { NextRequest, NextResponse } from 'next/server'
import { gcsService } from '@/services/gcp/cloud_storage/GoogleStorageService'
import { Id } from '@/convex/_generated/dataModel'
import { ImageDirectory, ImageQuality, ProcessedImageResult } from '@/services/gcp/cloud_storage/types'
import { AspectType } from '@/convex/types';
import Busboy from 'busboy';
import { Readable } from 'stream';

// Node.jsランタイムを使用（Edge FunctionではbusboyとStreamが使えないため）
export const runtime = 'nodejs';

// アップロードされたファイル情報の型
interface UploadedFile {
  filename: string;
  mimeType: string;
  buffer: Buffer;
}

// FormDataから抽出される情報の型
interface ParsedFormData {
  files: UploadedFile[];
  fields: Record<string, string>;
}

// FormDataをパースする関数
async function parseMultipartFormData(request: NextRequest): Promise<ParsedFormData> {
  return new Promise(async (resolve, reject) => {
    try {
      const contentType = request.headers.get('content-type');
      if (!contentType || !contentType.includes('multipart/form-data')) {
        reject(new Error('Content-Type must be multipart/form-data'));
        return;
      }

      const files: UploadedFile[] = [];
      const fields: Record<string, string> = {};

      const busboy = Busboy({ 
        headers: { 
          'content-type': contentType 
        },
        limits: {
          fileSize: 10 * 1024 * 1024, // 10MB制限
        }
      });

      // ファイルイベントハンドラ
      busboy.on('file', (fieldname, file, { filename, mimeType }) => {
        const chunks: Buffer[] = [];
        
        file.on('data', (data) => {
          chunks.push(data);
        });
        
        file.on('end', () => {
          const buffer = Buffer.concat(chunks);
          files.push({
            filename: filename || `uploaded_file_${Date.now()}`,
            mimeType: mimeType || 'application/octet-stream',
            buffer
          });
        });
      });

      // フィールドイベントハンドラ
      busboy.on('field', (fieldname, value) => {
        fields[fieldname] = value;
      });

      // 完了イベントハンドラ
      busboy.on('finish', () => {
        resolve({ files, fields });
      });

      // エラーハンドラ
      busboy.on('error', (error) => {
        reject(error);
      });

      // リクエストボディをストリームとして処理
      const reader = request.body?.getReader();
      if (!reader) {
        reject(new Error('Request body is not readable'));
        return;
      }

      const stream = new Readable({
        read() {}
      });

      stream.pipe(busboy);

      // データを読み取ってストリームに送信
      (async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            stream.push(Buffer.from(value));
          }
          stream.push(null); // ストリーム終了
        } catch (error) {
          stream.destroy(error as Error);
        }
      })();

    } catch (error) {
      reject(error);
    }
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // マルチパート形式でFormDataをパース
    const { files, fields } = await parseMultipartFormData(request);
    
    if (files.length === 0) {
      return NextResponse.json({ error: 'アップロードするファイルが見つかりません。' }, { status: 400 });
    }

    // パラメータの取得
    const orgId = fields.orgId;
    const directory = fields.directory;
    const aspectType = fields.aspectType || 'mobile';
    const quality = fields.quality as ImageQuality;
    const isHotSpot = fields.isHotSpot === 'true';

    if (!orgId || !directory) {
      return NextResponse.json({ error: '必要なパラメータ（orgId, directory）が不足しています。' }, { status: 400 });
    }

    // 複数ファイルの処理
    if (files.length > 1) {
      const uploadPromises = files.map(async (file: UploadedFile) => {
        return gcsService.uploadCompressedImageWithThumbnail(
          file.buffer.toString('base64'), // 既存の関数はbase64を期待するため変換
          file.filename,
          directory as ImageDirectory,
          orgId as Id<'organization'>,
          aspectType as AspectType,
          quality,
          isHotSpot
        );
      });

      const results = await Promise.allSettled(uploadPromises);

      const successfulUploads: ProcessedImageResult[] = [];
      const failedUploadsInfo: {fileName: string, error: string}[] = [];
      let hasFailure = false;

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successfulUploads.push(result.value);
        } else {
          hasFailure = true;
          console.error(`Failed to upload ${files[index].filename}:`, result.reason);
          failedUploadsInfo.push({
            fileName: files[index].filename,
            error: result.reason instanceof Error ? result.reason.message : String(result.reason)
          });
        }
      });

      if (hasFailure) {
        // 失敗があった場合、成功した画像を削除 (ロールバック)
        for (const uploaded of successfulUploads) {
          try {
            await gcsService.deleteImageWithThumbnail(uploaded.originalUrl);
          } catch (deleteErr) {
            console.error(`Failed to delete image ${uploaded.originalUrl} during rollback:`, deleteErr);
          }
        }
        return NextResponse.json({
          error: '一部の画像のアップロードに失敗しました。すべての処理がロールバックされました。',
          details: failedUploadsInfo
        }, { status: 500 });
      }

      return NextResponse.json({ successfulUploads });

    } else {
      // 単数ファイルの処理
      const file = files[0];
      
      const result = await gcsService.uploadCompressedImageWithThumbnail(
        file.buffer.toString('base64'), // 既存の関数はbase64を期待するため変換
        file.filename,
        directory as ImageDirectory,
        orgId as Id<'organization'>,
        aspectType as AspectType,
        quality,
        isHotSpot
      );
      
      return NextResponse.json([result]);
    }

  } catch (error) {
    console.error('FormData parsing or image upload error:', error);
    const errorMessage = error instanceof Error ? error.message : '画像のアップロード処理中に予期せぬエラーが発生しました。';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();

  // originalUrl (単数) と originalUrls (複数) の両方に対応できるようにする
  const { originalUrl, originalUrls, withThumbnail } = body;

  if (!originalUrl && (!Array.isArray(originalUrls) || originalUrls.length === 0)) {
    return NextResponse.json({ error: '画像URLが指定されていません。単数の場合は imgUrl、複数の場合は imgUrls を配列で指定してください。' }, { status: 400 });
  }

  try {
    let urlsToDelete: string[] = [];
    if (originalUrl) {
      urlsToDelete.push(originalUrl);
    } else if (originalUrls) {
      urlsToDelete = originalUrls;
    }

    const deletePromises = urlsToDelete.map(url => {
      if (withThumbnail) {
        return gcsService.deleteImageWithThumbnail(url);
      } else {
        return gcsService.deleteImage(url);
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

  } catch (error) { // これは主に CompressImageService の外での予期せぬエラーやリクエストボディのパースエラー
    console.error('Image delete processing error:', error);
    const errorMessage = error instanceof Error ? error.message : '画像削除処理中に予期せぬエラーが発生しました。';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
