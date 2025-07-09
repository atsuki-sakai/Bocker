import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getEnv } from '@/lib/env-config'
import { SupabaseService } from '@/services/supabase/SupabaseService'
import { CouponTransactionRepository } from '@/services/supabase/repositories/coupon/CouponTransactionRepository'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { api } from '@/convex/_generated/api'
import { fetchMutation } from 'convex/nextjs'
import { Id } from '@/convex/_generated/dataModel'

// バリデーションスキーマ
const createCouponTransactionSchema = z.object({
  tenant_id: z.string(),
  org_id: z.string(),
  coupon_id: z.string(),
  customer_uid: z.string().uuid(),
  reservation_id: z.string(),
  discount_amount: z.number().int().positive(),
})

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // リクエストボディの取得と検証
    const body = await request.json()
    const validationResult = createCouponTransactionSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation error', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Supabaseクライアントの作成（サーバーサイドでのみService Role Keyを使用）
    const supabase = createClient(
      getEnv('NEXT_PUBLIC_SUPABASE_URL'),
      getEnv('SUPABASE_SERVICE_ROLE_KEY')
    )
    const supabaseService = new SupabaseService(supabase)
    const couponTransactionRepo = new CouponTransactionRepository(supabaseService)

    // クーポントランザクションの作成
    const couponTransaction = await couponTransactionRepo.create({
      tenant_id: data.tenant_id,
      org_id: data.org_id,
      coupon_id: data.coupon_id,
      customer_uid: data.customer_uid,
      reservation_id: data.reservation_id,
      transaction_date_unix: Date.now(),
      discount_amount: data.discount_amount,
    })

    await fetchMutation(api.coupon.config.mutation.updateNumberOfUse, {
      type: 'decrement',
      tenant_id: data.tenant_id as Id<'tenant'>,
      org_id: data.org_id as Id<'organization'>,
      coupon_id: data.coupon_id as Id<'coupon'>,
    })

    console.log(
      `[API] Created coupon transaction: ${couponTransaction.id} for reservation: ${data.reservation_id}`
    )

    return NextResponse.json({
      success: true,
      data: couponTransaction,
    })
  } catch (error) {
    console.error('[API] Error creating coupon transaction:', error)
    
    // エラーレスポンス
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}