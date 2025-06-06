// app/api/clerk/webhooks/user-created/route.ts
// Clerk Webhook - ユーザー作成時の招待受諾処理

import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: NextRequest) {
  // 1. Webhook検証
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
  
  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local')
  }

  // ヘッダーを取得
  const headerPayload = headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    })
  }

  // ペイロードを取得
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // svixでWebhookを検証
  const wh = new Webhook(WEBHOOK_SECRET)
  let evt: any

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    })
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occured', {
      status: 400,
    })
  }

  // 2. イベントタイプの確認
  const { type, data } = evt

  if (type === 'user.created') {
    console.log('📧 ユーザー作成Webhook受信:', data.id)
    
    try {
      // 3. publicMetadataからstaff_id取得
      const { publicMetadata } = data
      
      if (!publicMetadata?.staff_id) {
        console.log('⚠️ staff_id がpublicMetadataに含まれていません')
        return NextResponse.json({ received: true })
      }

      const staffId = publicMetadata.staff_id
      const role = publicMetadata.role || 'staff'
      const extraCharge = publicMetadata.extra_charge
      const priority = publicMetadata.priority

      console.log('📝 招待受諾処理開始:', {
        staff_id: staffId,
        clerk_user_id: data.id,
        role,
      })

      // 4. Convexスタッフレコード更新
      await convex.mutation(api.staff.invitation.mutation.acceptInvitation, {
        staff_id: staffId as Id<'staff'>,
        clerk_user_id: data.id,
        role: role as any,
        ...(extraCharge !== undefined && { extra_charge: extraCharge }),
        ...(priority !== undefined && { priority: priority }),
      })

      console.log('✅ 招待受諾処理完了:', staffId)

      return NextResponse.json({ 
        received: true,
        processed: true,
        staff_id: staffId,
      })

    } catch (error) {
      console.error('❌ 招待受諾処理エラー:', error)
      
      // エラーログとして記録（必要に応じて）
      return NextResponse.json({
        received: true,
        processed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  // その他のイベントタイプは無視
  return NextResponse.json({ received: true })
}