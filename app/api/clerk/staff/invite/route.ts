// app/api/clerk/staff/invite/route.ts
// スタッフ招待API - Clerk Core 2を使用してスタッフ招待を実行

import { clerkClient, auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { BASE_URL } from '@/lib/constants'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: NextRequest) {
  console.log('▶️ 招待APIが呼び出されました')
  
  try {
    // 1. 認証チェック - 現在のユーザーが認証されているか確認
    console.log('🔐 認証チェック中...')
    const { userId } = await auth()
    console.log('👤 ユーザーID:', userId)
    
    if (!userId) {
      console.log('❌ 認証失敗')
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // 2. リクエストボディから必要な情報を取得
    console.log('💬 リクエストボディを解析中...')
    const { 
      email, 
      tenant_id, 
      org_id, 
      role,
      // スタッフ基本情報
      name,
      gender,
      age,
      instagram_link,
      description,
      tags,
      // 事前設定情報
      extra_charge,
      priority
    } = await req.json()
    console.log('📦 受信データ:', { email, tenant_id, org_id, role, name })

    // 3. 必須パラメータの検証
    if (!email || !tenant_id || !org_id || !role || !name || !gender) {
      console.log('❌ パラメータ不足')
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

    // 5. Convexに招待レコード作成（clerk_user_id = null）
    // 注: メール重複チェックはフロントエンドで事前に実施済み
    console.log('📝 Convexにスタッフレコード作成中...')
    const result = await convex.mutation(api.staff.invitation.mutation.createWithInvitation, {
      tenant_id: tenant_id as Id<"tenant">,
      org_id: org_id as Id<"organization">,
      name,
      email,
      gender,
      ...(age !== null && age !== undefined && { age }),
      ...(instagram_link && { instagram_link }),
      ...(description && { description }),
      tags: tags || [],
      ...(extra_charge !== null && extra_charge !== undefined && { extra_charge }),
      ...(priority !== null && priority !== undefined && { priority }),
    })

    console.log('✅ Convexスタッフレコード作成成功:', result.staffId)

    // 7. Clerk招待送信（publicMetadataにstaff_idを含める）
    console.log('🏢 Clerk Clientの有無:', !!clerkClient)
    
    const invitationParams = {
      emailAddress: email,
      redirectUrl: `${BASE_URL}/invite-accept`,
      publicMetadata: {
        tenant_id,
        org_id,
        role,
        staff_id: result.staffId,
        // 事前設定情報も含める（値がある場合のみ）
        ...(result.preConfig.extra_charge !== undefined && { extra_charge: result.preConfig.extra_charge }),
        ...(result.preConfig.priority !== undefined && { priority: result.preConfig.priority }),
        invited_by: userId,
        invited_at: new Date().toISOString()
      },
      notify: true,
      ignoreExisting: true
    }
    
    console.log('🚀 招待パラメータ:', invitationParams)
    console.log('📧 招待作成を実行中...')
    
    const clerk = await clerkClient()
    let invitation
    try {
      invitation = await clerk.invitations.createInvitation(invitationParams)
      console.log('✅ Clerk招待作成成功:', invitation.id)
    } catch (clerkError) {
      // Clerk招待作成失敗時のrollback処理
      console.error('❌ Clerk招待作成失敗、Convexレコードをキャンセル中...')
      await convex.mutation(api.staff.invitation.mutation.cancelInvitation, {
        staff_id: result.staffId as Id<"staff">,
      })
      throw clerkError
    }

    // 8. 成功レスポンスを返す
    return NextResponse.json({
      success: true,
      invitation_id: invitation.id,
      staff_id: result.staffId,
      message: '招待メールを送信しました',
    })

  } catch (error: unknown) {
    // 9. エラーハンドリング
    console.error('🚨 招待作成エラー:', error)
    console.error('🐞 エラーの詳細:', JSON.stringify(error, null, 2))
    
    // エラータイプを詳細に分析
    if (error instanceof Error) {
      console.error('📄 エラーメッセージ:', error.message)
      console.error('📋 エラースタック:', error.stack)
    }
    
    // Clerkのエラーレスポンスを解析
    if (error && typeof error === 'object' && 'errors' in error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clerkErrors = error.errors as any[]
      if (clerkErrors?.[0]?.code === 'form_identifier_exists') {
        return NextResponse.json(
          { error: 'このメールアドレスは既にClerkに登録されています' },
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