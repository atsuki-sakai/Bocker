// app/api/clerk/staff/invitations/route.ts
// 招待状況管理API - 招待の確認・再送・キャンセル機能

import { clerkClient } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

// 招待一覧取得（保留中のもののみ）
export async function GET(req: NextRequest) {
  try {
    // 1. 認証チェック
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // 2. クエリパラメータからテナント・組織IDを取得（フィルタリング用）
    const { searchParams } = new URL(req.url)
    const tenant_id = searchParams.get('tenant_id')
    const org_id = searchParams.get('org_id')

    // 3. 保留中の招待一覧を取得
    const clerk = await clerkClient()
    const invitations = await clerk.invitations.getInvitationList({
      status: 'pending', // 保留中のもののみ
      limit: 50,         // 最大50件
    })

    // 4. テナント・組織でフィルタリング（必要に応じて）
    let filteredInvitations = invitations.data
    if (tenant_id && org_id) {
      filteredInvitations = invitations.data.filter((invitation) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const metadata = invitation.publicMetadata as any
        return metadata?.tenant_id === tenant_id && metadata?.org_id === org_id
      })
    }

    // 5. レスポンス用にデータを整形
    const formattedInvitations = filteredInvitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.emailAddress,
      status: invitation.status,
      created_at: invitation.createdAt,
      metadata: invitation.publicMetadata,
    }))

    return NextResponse.json({
      success: true,
      invitations: formattedInvitations,
      total: filteredInvitations.length,
    })

  } catch (error: unknown) {
    console.error('招待一覧取得エラー:', error)
    return NextResponse.json(
      { error: '招待一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}

// 招待の再送
export async function POST(req: NextRequest) {
  try {
    // 1. 認証チェック
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // 2. リクエストボディから再送に必要な情報を取得
    const { email, tenant_id, org_id, role } = await req.json()

    // 3. 必須パラメータの検証
    if (!email || !tenant_id || !org_id || !role) {
      return NextResponse.json(
        { error: '必要なパラメータが不足しています' },
        { status: 400 }
      )
    }

    // 4. 新しい招待を作成（再送）
    const clerk = await clerkClient()
    const invitation = await clerk.invitations.createInvitation({
      emailAddress: email,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invite-accept`,
      publicMetadata: {
        tenant_id,
        org_id,
        role,
        invited_by: userId,
        invited_at: new Date().toISOString(),
        resent: true, // 再送フラグ
      },
      notify: true,
      ignoreExisting: true, // 既存招待を無視して新規作成
    })

    return NextResponse.json({
      success: true,
      invitation_id: invitation.id,
      message: '招待メールを再送しました',
    })

  } catch (error: unknown) {
    console.error('招待再送エラー:', error)
    return NextResponse.json(
      { error: '招待の再送に失敗しました' },
      { status: 500 }
    )
  }
}