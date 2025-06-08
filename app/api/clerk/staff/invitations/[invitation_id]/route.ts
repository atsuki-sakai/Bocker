// app/api/clerk/staff/invitations/[invitation_id]/route.ts
// 個別招待管理API - 特定の招待のキャンセル

import { clerkClient, currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

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

    // 3. クエリパラメータからstaff_idを取得
    const { searchParams } = new URL(req.url)
    const staff_id = searchParams.get('staff_id')

    if (!staff_id) {
      return NextResponse.json(
        { error: 'staff_idが必要です' },
        { status: 400 }
      )
    }

    // 4. Clerk招待キャンセル
    const clerk = await clerkClient()
    try {
      await clerk.invitations.revokeInvitation(invitation_id)
      console.log('✅ Clerk招待キャンセル成功')
    } catch (clerkError) {
      console.error('❌ Clerk招待キャンセルエラー:', clerkError)
      // Clerkエラーでも続行（既にキャンセル済みの可能性）
    }

    // 5. Convexスタッフレコード削除＆招待ステータス更新
    try {
      // 招待ステータスを'revoked'に更新
      await convex.mutation(api.staff.mutation.updateInvitationInfo, {
        staff_id: staff_id as Id<"staff">,
        clerk_invitation_id: invitation_id,
        invitation_email: '', // キャンセルされたので空にする
        invitation_status: 'revoked' as const,
      })
      
      // スタッフレコードを論理削除
      await convex.mutation(api.staff.invitation.mutation.cancelInvitation, {
        staff_id: staff_id as Id<"staff">,
      })
      console.log('✅ Convexスタッフレコード削除成功')
    } catch (convexError) {
      console.error('❌ Convexスタッフレコード削除エラー:', convexError)
      // 整合性のため、エラーを返す
      return NextResponse.json(
        { error: 'スタッフレコードの削除に失敗しました' },
        { status: 500 }
      )
    }

    // 6. 成功レスポンス
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