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
    const { fileName, contentType, orgId, directory }: SignedUrlRequest = await req.json();
    if (!fileName || !contentType || !orgId || !directory) {
      return NextResponse.json({ error: '必要な情報が不足しています' }, { status: 400 });
    }
    // ファイル名・ディレクトリの安全性チェックをここで追加
    // 署名付きURL発行処理へ
    const { url, filePath } = await gcsService.getSignedUploadUrl(fileName, contentType, orgId, directory);
      // 型明示（型アサーション）
  const response: SignedUrlResponse = { url, filePath };
  return NextResponse.json(response);
  }