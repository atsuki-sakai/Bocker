import { NextRequest, NextResponse } from 'next/server'
import { gcsService } from '@/services/gcp/cloud_storage/GoogleStorageService'
import { Id } from '@/convex/_generated/dataModel'

// 型定義
interface SignedUrlRequest {
    fileName: string;        // 必須、ファイル名
    contentType: string;     // 必須、MIMEタイプ
    orgId: Id<'organization'>;           // 必須、組織ID（Id<'organization'>型のバリデーションを厳格に！）
    directory: string;       // 必須、保存ディレクトリ
}

interface SignedUrlResponse {
    url: string;
    filePath: string;
}

export async function POST(req: NextRequest) {
  try {
    console.log('[署名付きURL API] リクエスト開始')
    
    const { fileName, contentType, orgId, directory }: SignedUrlRequest = await req.json();
    
    console.log('[署名付きURL API] リクエストパラメータ:', {
      fileName,
      contentType,
      orgId,
      directory
    })
    
    // パラメータ検証
    if (!fileName || !contentType || !orgId || !directory) {
      console.error('[署名付きURL API] 必要な情報が不足:', {
        fileName: !!fileName,
        contentType: !!contentType,
        orgId: !!orgId,
        directory: !!directory
      })
      return NextResponse.json({ error: '必要な情報が不足しています' }, { status: 400 });
    }
    
    // ファイル名・ディレクトリの安全性チェック
    if (fileName.includes('..') || directory.includes('..')) {
      console.error('[署名付きURL API] 不正なパス:', { fileName, directory })
      return NextResponse.json({ error: '不正なパスが検出されました' }, { status: 400 });
    }
    
    // 署名付きURL発行処理
    console.log('[署名付きURL API] 署名付きURL生成開始')
    console.log('[署名付きURL API] 使用するContent-Type:', contentType)
    const { url, filePath } = await gcsService.getSignedUploadUrl(fileName, contentType, orgId, directory);
    
    console.log('[署名付きURL API] 署名付きURL生成成功:', {
      filePath,
      urlLength: url.length,
      signedContentType: contentType
    })
    
    // 型明示（型アサーション）
    const response: SignedUrlResponse = { url, filePath };
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[署名付きURL API] エラー発生:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました', details: error instanceof Error ? error.message : '不明なエラー' }, 
      { status: 500 }
    );
  }
}