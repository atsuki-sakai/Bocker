// app/api/clerk/staff/invite/route.ts
// スタッフ招待API - Clerk Core 2を使用してスタッフ招待を実行

import { clerkClient } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function POST(req: NextRequest) {
  try {

    const clerk = await clerkClient()
    // 1. 認証チェック - 現在のユーザーが認証されているか確認
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // 2. リクエストボディから必要な情報を取得
    const { email, tenant_id, org_id, role } = await req.json()

    // 3. 必須パラメータの検証
    if (!email || !tenant_id || !org_id || !role) {
      return NextResponse.json(
        { error: '必要なパラメータが不足しています' },
        { status: 400 }
      )
    }

    // 4. メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'メールアドレスの形式が正しくありません' },
        { status: 400 }
      )
    }

    // 5. 招待の作成実行
    const invitation = await clerk.invitations.createInvitation({
      emailAddress: email,
      // リダイレクト先のURL（招待受け入れページ）
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invite-accept`,
      // パブリックメタデータに組織情報とロールを設定
      publicMetadata: {
        tenant_id,    // テナントID（どのサロンか）
        org_id,       // 組織ID（細分化された部門など）
        role,         // 権限（staff/manager/owner）
        invited_by: userId, // 招待者のID
        invited_at: new Date().toISOString(), // 招待日時
      },
      notify: true,           // メール自動送信を有効
      ignoreExisting: true,   // 既存招待があっても新規発行
    })

    // 6. 成功レスポンスを返す
    return NextResponse.json({
      success: true,
      invitation_id: invitation.id,
      message: '招待メールを送信しました',
    })

  } catch (error: unknown) {
    // 7. エラーハンドリング
    console.error('招待作成エラー:', error)
    
    // Clerkのエラーレスポンスを解析
    if (error && typeof error === 'object' && 'errors' in error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clerkErrors = error.errors as any[]
      if (clerkErrors?.[0]?.code === 'form_identifier_exists') {
        return NextResponse.json(
          { error: 'このメールアドレスは既に登録されています' },
          { status: 400 }
        )
      }
    }
    
    return NextResponse.json(
      { error: '招待の作成に失敗しました' },
      { status: 500 }
    )
  }
}