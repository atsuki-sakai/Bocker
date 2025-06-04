// app/api/clerk/staff/invite/route.ts
// スタッフ招待API - Clerk Core 2を使用してスタッフ招待を実行

import { clerkClient, auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { BASE_URL } from '@/lib/constants'

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
    const { email, tenant_id, org_id, role } = await req.json()
    console.log('📦 受信データ:', { email, tenant_id, org_id, role })

    // 3. 必須パラメータの検証
    if (!email || !tenant_id || !org_id || !role) {
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

    // 5. 招待の作成実行
    console.log('🏢 Clerk Clientの有無:', !!clerkClient)
    console.log('🌐 NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL)
    console.log('🔑 CLERK_SECRET_KEYの有無:', !!process.env.CLERK_SECRET_KEY)
    
    const invitationParams = {
      emailAddress: email,
      redirectUrl: `${BASE_URL}/invite-accept`,
      publicMetadata: {
        tenant_id,
        org_id,
        role,
        invited_by: userId,
        invited_at: new Date().toISOString()
      },
      notify: true,
      ignoreExisting: true
    }
    
    console.log('🚀 招待パラメータ:', invitationParams)
    console.log('📧 招待作成を実行中...')
    
    const clerk = await clerkClient()
    const invitation = await clerk.invitations.createInvitation(invitationParams)
    
    console.log('✅ 招待作成成功:', invitation.id)

    // 6. 成功レスポンスを返す
    return NextResponse.json({
      success: true,
      invitation_id: invitation.id,
      message: '招待メールを送信しました',
    })

  } catch (error: unknown) {
    // 7. エラーハンドリング
    console.error('🚨 招待作成エラー:', error)
    console.error('🐞 エラーの詳細:', JSON.stringify(error, null, 2))
    
    // Clerkの環境変数を確認
    console.log('🔑 CLERK_SECRET_KEYの有無:', !!process.env.CLERK_SECRET_KEY)
    console.log('🌐 NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL)
    
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