// app/api/clerk/staff/invitations/[invitation_id]/route.ts
// 個別招待管理API - 特定の招待のキャンセル

import { clerkClient, currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

// 招待のキャンセル（無効化）
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ invitation_id: string }> }
) {
  try {
    // 1. 認証チェック
    const user = await currentUser()
    if (!user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // 2. パラメータから招待IDを取得
    const { invitation_id } = await params

    if (!invitation_id) {
      return NextResponse.json(
        { error: '招待IDが必要です' },
        { status: 400 }
      )
    }

    // 3. 招待の無効化を実行
    const clerk = await clerkClient()
    await clerk.invitations.revokeInvitation(invitation_id)

    // 4. 成功レスポンス
    return NextResponse.json({
      success: true,
      message: '招待をキャンセルしました',
    })

  } catch (error: unknown) {
    console.error('招待キャンセルエラー:', error)
    
    // 招待が見つからない場合のエラーハンドリング
    if (error && typeof error === 'object' && 'errors' in error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clerkErrors = error.errors as any[]
      if (clerkErrors?.[0]?.code === 'resource_not_found') {
        return NextResponse.json(
          { error: '指定された招待が見つかりません' },
          { status: 404 }
        )
      }
    }
    
    return NextResponse.json(
      { error: '招待のキャンセルに失敗しました' },
      { status: 500 }
    )
  }
}