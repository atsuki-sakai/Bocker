// app/api/clerk/staff/delete/route.ts
// スタッフ削除API - Clerkユーザーの完全削除

import { clerkClient, currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { gcsService } from '@/services/gcp/cloud_storage/GoogleStorageService'
import { z } from 'zod'
import { validateRequest, createValidationErrorResponse } from '@/lib/api/validation'
import { convexIdSchema } from '@/lib/validations/api/common'
import { getEnv } from '@/lib/env-config'

const convex = new ConvexHttpClient(getEnv('NEXT_PUBLIC_CONVEX_URL'))

// Delete staff schema
const deleteStaffRequestSchema = z.object({
  staff_id: convexIdSchema,
  tenant_id: convexIdSchema,
  org_id: convexIdSchema,
  staff_config_id: convexIdSchema.optional(),
})

export async function DELETE(req: NextRequest) {
  try {
    // 1. 認証チェック
    const user = await currentUser()
    if (!user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }
    const role = user.publicMetadata?.role;
    if(role !== 'admin') {
      return NextResponse.json(
        { error: '権限がありません' },
        { status: 403 }
      )
    }

    // 2. リクエストボディの検証
    const validation = await validateRequest(req, deleteStaffRequestSchema)
    if (!validation.success) {
      return createValidationErrorResponse(validation.error)
    }

    const { staff_id, tenant_id, org_id, staff_config_id } = validation.data

    // 4. Convexからスタッフ情報を取得して招待状態確認
    const staffData = await convex.query(api.staff.invitation.query.getStaffWithInvitation, {
      staff_id: staff_id as Id<"staff">,
    })

    if (!staffData) {
      return NextResponse.json(
        { error: 'スタッフが見つかりません' },
        { status: 404 }
      )
    }
    
    // 6. 招待状態に応じた処理
    const clerk = await clerkClient()
    
    if (staffData.invitationStatus === 'pending' && staffData.invitation_id) {
      // 招待中の場合：保存されているClerk招待IDで直接キャンセル
      try {
        await clerk.invitations.revokeInvitation(staffData.invitation_id)
        console.log('✅ Clerk招待キャンセル成功')
      } catch (inviteError) {
        console.error('❌ Clerk招待キャンセルエラー:', inviteError)
        
        // resource_not_found以外のエラーは処理を停止
        if (inviteError && typeof inviteError === 'object' && 'errors' in inviteError) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const clerkErrors = inviteError.errors as any[]
          if (clerkErrors?.[0]?.code !== 'resource_not_found') {
            return NextResponse.json(
              { error: 'Clerk招待の取り消しに失敗しました' },
              { status: 500 }
            )
          }
        } else {
          // 予期しないエラーの場合も停止
          return NextResponse.json(
            { error: 'Clerk招待の取り消しに失敗しました' },
            { status: 500 }
          )
        }
      }
    } else if (staffData.clerk_user_id) {
      // 受諾済みの場合：Clerkユーザー削除
      try {
        await clerk.users.deleteUser(staffData.clerk_user_id)
        console.log('✅ Clerkユーザー削除成功')
      } catch (userError) {
        console.error('❌ Clerkユーザー削除エラー:', userError)
        // エラーでも続行（既に削除済みの可能性）
      }
    }

    // 7. Convex関連データ削除
    await convex.mutation(api.staff.mutation.killRelatedTables, {
      tenant_id: tenant_id as Id<"tenant">,
      org_id: org_id as Id<"organization">,
      staff_id: staff_id as Id<"staff">,
      staff_config_id: staff_config_id as Id<"staff_config">
    })

    // 8. 画像削除（存在する場合）
    if (staffData.images && staffData.images.length > 0) {
      for (const image of staffData.images) {
        try {
          await gcsService.deleteImageWithThumbnail(image.original_url)
          console.log(`✅ 画像削除成功: ${image.original_url}`)
        } catch (imageError) {
          console.error(`❌ 画像削除エラー: ${image.original_url}`, imageError)
          // エラーでも続行
        }
      }
    }

    // 9. 成功レスポンス
    return NextResponse.json({
      success: true,
      message: 'スタッフを削除しました',
      deleted_staff_id: staff_id,
      invitation_status: staffData.invitationStatus,
    })

  } catch (error: unknown) {
    console.error('スタッフ削除エラー:', error)
    
    // エラーハンドリング
    if (error && typeof error === 'object' && 'errors' in error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clerkErrors = error.errors as any[]
      if (clerkErrors?.[0]?.code === 'resource_not_found') {
        return NextResponse.json(
          { error: '指定されたユーザーが見つかりません' },
          { status: 404 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'スタッフの削除に失敗しました' },
      { status: 500 }
    )
  }
}