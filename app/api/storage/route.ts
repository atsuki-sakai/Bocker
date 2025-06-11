import { NextRequest, NextResponse } from 'next/server'
import { gcsService } from '@/services/gcp/cloud_storage/GoogleStorageService'
import { Id } from '@/convex/_generated/dataModel'
import { ImageDirectory, ProcessedImageResult } from '@/services/gcp/cloud_storage/types'
import { AspectType } from '@/convex/types';
import Busboy from 'busboy';
import { Readable } from 'stream';
import { withAuth, validateRequest } from '@/lib/api/middleware'
import { storageDeleteSchema, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '@/lib/validations/api'
import { convexIdSchema, directorySchema, qualitySchema, aspectTypeSchema, extractOrgIdFromGcsUrl } from '@/lib/validations/api'
import { z } from 'zod'

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

/**
 * multipart/form-data形式のHTTPリクエストからファイルとフィールドを抽出する
 * @param request - Next.jsのHTTPリクエストオブジェクト
 * @returns ファイルとフィールドのパース結果
 * @throws Error Content-Typeがmultipart/form-dataでない、またはリクエストボディが読み取り不可の場合
 */
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
          fileSize: MAX_FILE_SIZE, // 10MB制限
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

/**
 * ファイルアップロードAPIのPOSTエンドポイント
 * multipart/form-data形式でアップロードされた画像を圧縮・サムネイル生成してGCSに保存する
 * @param request - Next.jsのHTTPリクエストオブジェクト
 * @returns アップロード結果（単数または複数の画像URL）
 */
export const POST = withAuth(async (request, auth) => {
  try {
    // マルチパート形式でFormDataをパース
    const { files, fields } = await parseMultipartFormData(request);
    
    if (files.length === 0) {
      return NextResponse.json({ error: 'アップロードするファイルが見つかりません。' }, { status: 400 });
    }

    // パラメータの取得と検証
    const uploadSchema = z.object({
      orgId: convexIdSchema,
      directory: directorySchema,
      aspectType: aspectTypeSchema.optional(),
      quality: qualitySchema.optional(),
      isHotSpot: z.string().optional().transform(val => val === 'true'),
    });

    let validatedFields;
    try {
      validatedFields = uploadSchema.parse(fields);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ 
          error: 'パラメータの形式が不正です',
          details: error.errors 
        }, { status: 400 });
      }
      return NextResponse.json({ error: 'パラメータの形式が不正です' }, { status: 400 });
    }

    const { orgId, directory, aspectType = 'mobile', quality, isHotSpot = false } = validatedFields;

    // Check if orgId matches authenticated organization
    if (orgId !== auth.orgId) {
      return NextResponse.json({ error: 'このファイルをアップロードする権限がありません' }, { status: 403 });
    }

    // ファイルのMIMEタイプ検証
    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.includes(file.mimeType)) {
        return NextResponse.json({ 
          error: `許可されていないファイル形式です: ${file.mimeType}`,
          allowedTypes: ALLOWED_MIME_TYPES 
        }, { status: 400 });
      }
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
})

/**
 * ファイル削除APIのDELETEエンドポイント
 * 指定された画像URLに対応するGCSオブジェクトを削除する
 * @param request - Next.jsのHTTPリクエストオブジェクト
 * @returns 削除結果（成功・失敗の詳細）
 */
export const DELETE = withAuth(async (request, auth) => {
  // Validate request body
  const validation = await validateRequest(request, storageDeleteSchema)
  if (validation.error) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }
  if (!validation.data) {
    return NextResponse.json({ error: 'パラメータが見つかりません' }, { status: 400 })
  }

  const { originalUrl, originalUrls, withThumbnail } = validation.data

  try {
    let urlsToDelete: string[] = [];
    if (originalUrl) {
      urlsToDelete.push(originalUrl);
    } else if (originalUrls) {
      urlsToDelete = originalUrls;
    }

    // Verify ownership of all URLs
    for (const url of urlsToDelete) {
      const urlOrgId = extractOrgIdFromGcsUrl(url)
      if (!urlOrgId || urlOrgId !== auth.orgId) {
        return NextResponse.json(
          { error: `削除権限がありません: ${url}` },
          { status: 403 }
        )
      }
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
})
