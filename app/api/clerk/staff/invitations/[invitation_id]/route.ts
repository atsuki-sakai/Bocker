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
    let clerkCancelSuccess = false
    
    // まず招待の状態を確認
    try {
     
      await clerk.invitations.revokeInvitation(invitation_id)
      console.log('✅ Clerk招待キャンセル成功')
      clerkCancelSuccess = true
    } catch (clerkError: any) {
      console.error('❌ Clerk招待処理エラー:', clerkError)
      
      // Clerk側で招待が既に削除されている場合は成功として扱う
      if (clerkError?.errors?.[0]?.code === 'resource_not_found') {
        console.log('✅ Clerk招待は既に削除済みです')
        clerkCancelSuccess = true
      } else if (clerkError?.status === 400) {
        // Bad Requestの場合、招待が無効な状態の可能性がある
        console.log('⚠️ Clerk招待が無効な状態です - 処理を続行')
        clerkCancelSuccess = true
      } else {
        // その他のエラーの場合はログに記録して続行
        console.error('⚠️ Clerk招待削除でエラーが発生しましたが処理を続行します')
        clerkCancelSuccess = false
      }
    }

    // 5. Convexスタッフレコード削除
    try {
      // スタッフレコードを論理削除（招待情報も含めて処理される）
      await convex.mutation(api.staff.invitation.mutation.cancelInvitation, {
        staff_id: staff_id as Id<"staff">,
      })
      console.log('✅ Convexスタッフレコード削除成功')
    } catch (convexError) {
      console.error('❌ Convexスタッフレコード削除エラー:', convexError)
      // スタッフが既に削除済みの場合は成功として扱う
      const errorMessage = convexError instanceof Error ? convexError.message : String(convexError)
      if (errorMessage.includes('スタッフが見つかりません') || errorMessage.includes('指定されたスタッフが存在しません')) {
        console.log('✅ スタッフは既に削除済みです')
      } else {
        // 他のエラーの場合は失敗として扱う
        return NextResponse.json(
          { error: 'スタッフレコードの削除に失敗しました' },
          { status: 500 }
        )
      }
    }

    // 6. 成功レスポンス
    return NextResponse.json({
      success: true,
      message: '招待をキャンセルしました',
      details: {
        clerkCancelSuccess,
        convexCancelSuccess: true,
      }
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