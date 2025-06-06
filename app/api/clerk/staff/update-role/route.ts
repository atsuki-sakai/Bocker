// app/api/clerk/staff/update-role/route.ts
// スタッフ権限更新時にClerkのpublic_metadataも更新

import { clerkClient, currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function PATCH(req: NextRequest) {
  try {
    // 1. 認証チェック
    const user = await currentUser()
    if (!user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // 2. リクエストボディから更新情報を取得
    const { 
      staff_id,
      clerk_user_id,
      new_role,
      tenant_id,
      org_id
    } = await req.json()

    // 3. 必須パラメータの検証
    if (!staff_id || !new_role) {
      return NextResponse.json(
        { error: '必要なパラメータが不足しています' },
        { status: 400 }
      )
    }

    // 4. Convex側のstaff_auth更新（既存処理）
    console.log('📝 Convex staff_auth更新中...')
    
    // 5. Clerkユーザーが存在する場合のみpublic_metadata更新
    if (clerk_user_id) {
      console.log('🔄 Clerk public_metadata更新中...')
      const clerk = await clerkClient()
      
      try {
        // 現在のメタデータを取得
        const clerkUser = await clerk.users.getUser(clerk_user_id)
        const currentMetadata = clerkUser.publicMetadata as any || {}
        
        // roleのみを更新（他のメタデータは保持）
        const updatedMetadata = {
          ...currentMetadata,
          role: new_role,
          // 更新者情報も記録
          last_role_updated_by: user.id,
          last_role_updated_at: new Date().toISOString(),
        }
        
        await clerk.users.updateUserMetadata(clerk_user_id, {
          publicMetadata: updatedMetadata
        })
        
        console.log('✅ Clerk public_metadata更新成功')
      } catch (clerkError) {
        console.error('❌ Clerk public_metadata更新エラー:', clerkError)
        // Clerkの更新に失敗してもConvex側は成功として扱う
        // ただし、警告として返す
        return NextResponse.json({
          success: true,
          warning: 'Convex側の更新は成功しましたが、Clerkの権限情報更新に失敗しました',
          staff_id,
          new_role,
        })
      }
    }

    // 6. 成功レスポンス
    return NextResponse.json({
      success: true,
      message: 'スタッフ権限を更新しました',
      staff_id,
      new_role,
      clerk_updated: !!clerk_user_id,
    })

  } catch (error: unknown) {
    console.error('スタッフ権限更新エラー:', error)
    
    return NextResponse.json(
      { error: 'スタッフ権限の更新に失敗しました' },
      { status: 500 }
    )
  }
}