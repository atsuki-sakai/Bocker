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

    // 4. Convexからスタッフ情報を取得してClerk招待IDを確認
    const staffData = await convex.query(api.staff.invitation.query.getStaffWithInvitation, {
      staff_id: staff_id as Id<"staff">,
    })

    if (!staffData) {
      return NextResponse.json(
        { error: 'スタッフが見つかりません' },
        { status: 404 }
      )
    }

    // 5. Clerk招待をキャンセル
    const clerk = await clerkClient()
    let clerkCancelSuccess = false
    let clerkError: string | null = null
    
    // デバッグ情報を追加
    console.log('🔍 招待キャンセル処理開始:', {
      urlParamInvitationId: invitation_id,
      staffId: staff_id,
      convexClerkInvitationId: staffData.clerk_invitation_id,
      invitationStatus: staffData.invitationStatus,
    })
    
    if (staffData.invitationStatus === 'pending' && staffData.clerk_invitation_id) {
      try {
        // 現在の組織の全招待を取得してデバッグ
        if (staffData.org_id) {
          try {
            const invitations = await clerk.invitations.getInvitationList()
            console.log('📋 現在の組織の招待一覧:', invitations.data.map(inv => ({
              id: inv.id,
              emailAddress: inv.emailAddress,
              status: inv.status,
              createdAt: inv.createdAt,
            })))
          } catch (listError) {
            console.error('招待一覧取得エラー:', listError)
          }
        }
        
        // 保存されているClerk招待IDで直接削除
        const revokedInvitation = await clerk.invitations.revokeInvitation(staffData.clerk_invitation_id)
        console.log('✅ Clerk招待キャンセル成功:', {
          invitationId: staffData.clerk_invitation_id,
          revokedStatus: revokedInvitation.status,
          revokedAt: revokedInvitation.createdAt,
        })
        
        
        clerkCancelSuccess = true
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        console.error('❌ Clerk招待処理エラー:', error)
        
        // エラーの詳細を記録
        const errorCode = error?.errors?.[0]?.code
        const errorMessage = error?.errors?.[0]?.message || error?.message
        
        if (errorCode === 'resource_not_found') {
          console.log('✅ Clerk招待は既に削除済みです')
          clerkCancelSuccess = true
        } else if (errorMessage && (
          errorMessage.toLowerCase().includes('already revoked') ||
          errorMessage.toLowerCase().includes('invitation is already revoked') ||
          errorMessage.toLowerCase().includes('invitation has already been revoked')
        )) {
          // 招待が既に取り消されている場合も成功として扱う
          console.log('✅ Clerk招待は既に取り消し済みです')
          clerkCancelSuccess = true
        } else if (errorCode === 'unauthorized' || errorCode === 'forbidden') {
          console.error('❌ 権限エラー: この招待を取り消す権限がありません')
          clerkCancelSuccess = false
          clerkError = 'この招待を取り消す権限がありません'
        } else {
          console.error(`❌ Clerk招待削除失敗: Code=${errorCode}, Message=${errorMessage}`)
          console.error('エラーオブジェクト全体:', JSON.stringify(error, null, 2))
          clerkCancelSuccess = false
          clerkError = `Clerk招待削除失敗: ${errorMessage}`
        }
      }
    } else {
      // 招待状態がpending以外、またはClerk招待IDが存在しない場合
      console.log(`⚠️ 招待状態: ${staffData.invitationStatus}, Clerk招待ID: ${staffData.clerk_invitation_id}`)
      clerkCancelSuccess = true // Convex側のクリーンアップのみ実行
    }

    // Clerk側でエラーが発生した場合は処理を停止
    if (!clerkCancelSuccess && clerkError) {
      return NextResponse.json(
        { error: clerkError },
        { status: 500 }
      )
    }

    // 6. Convexスタッフレコード削除
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

    // 7. 成功レスポンス
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