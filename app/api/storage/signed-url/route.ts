import { NextResponse } from 'next/server'
import { storageService } from '@/services/gcp/cloud_storage/GoogleStorageService'
import { Id } from '@/convex/_generated/dataModel'
import { withAuthAndValidation } from '@/lib/api/middleware'
import { signedUrlRequestSchema } from '@/lib/validations/api'

// 型定義
interface SignedUrlResponse {
    url: string;
    filePath: string;
}

export const POST = withAuthAndValidation(
  signedUrlRequestSchema,
  async (req, auth, data) => {
    if (!data) {
      return NextResponse.json({ error: 'パラメータが見つかりません' }, { status: 400 })
    }
    const { fileName, contentType, orgId, directory } = data
    
    console.log('[署名付きURL API] リクエスト開始')
    console.log('[署名付きURL API] リクエストパラメータ:', {
      fileName,
      contentType,
      orgId,
      directory
    })
    
    // Check if orgId matches authenticated organization
    if (orgId !== auth.orgId) {
      return NextResponse.json({ error: 'この組織のファイルをアップロードする権限がありません' }, { status: 403 })
    }
    
    // ファイル名・ディレクトリの安全性チェック
    if (fileName.includes('..') || directory.includes('..')) {
      console.error('[署名付きURL API] 不正なパス:', { fileName, directory })
      return NextResponse.json({ error: '不正なパスが検出されました' }, { status: 400 })
    }
    
    // 署名付きURL発行処理
    console.log('[署名付きURL API] 署名付きURL生成開始')
    console.log('[署名付きURL API] 使用するContent-Type:', contentType)
    const { url, filePath } = await storageService.getSignedUploadUrl(fileName, contentType, orgId as Id<'organization'>, directory);
    
    console.log('[署名付きURL API] 署名付きURL生成成功:', {
      filePath,
      urlLength: url.length,
      signedContentType: contentType
    })
    
    // 型明示（型アサーション）
    const response: SignedUrlResponse = { url, filePath };
    return NextResponse.json(response);
  }
)
