import { NextRequest, NextResponse } from 'next/server';
import { gcsService } from '@/services/gcp/cloud_storage/GoogleStorageService';
import { ImageDirectory, ImageQuality } from '@/services/gcp/cloud_storage/types';
import { AspectType } from '@/convex/types';
import { Id } from '@/convex/_generated/dataModel';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      base64Data, 
      fileName, 
      directory, 
      orgId, 
      aspectType, 
      quality
    } = body;

    // バリデーション
    if (!base64Data || !fileName || !directory || !orgId || !aspectType) {
      return NextResponse.json(
        { error: '必須パラメータが不足しています' },
        { status: 400 }
      );
    }

    // 画像アップロード処理
    const result = await gcsService.uploadCompressedImageWithThumbnail(
      base64Data,
      fileName,
      directory as ImageDirectory,
      orgId as Id<'organization'>,
      aspectType as AspectType,
      quality as ImageQuality
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('[画像アップロードAPI] エラー:', error);
    
    // エラーレスポンス
    const err = error as { statusCode?: number; message?: string };
    if (err.statusCode) {
      return NextResponse.json(
        { error: err.message || '画像のアップロードに失敗しました' },
        { status: err.statusCode }
      );
    }
    
    return NextResponse.json(
      { error: '画像のアップロードに失敗しました' },
      { status: 500 }
    );
  }
}