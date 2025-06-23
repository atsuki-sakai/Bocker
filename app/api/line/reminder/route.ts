import { ReservationMenu, ReservationOption } from '@/convex/types'
import { NextResponse } from 'next/server'
import { LineService } from '@/services/line/LineService'
import { api } from '@/convex/_generated/api'
import { fetchQuery } from 'convex/nextjs'
import { Id } from '@/convex/_generated/dataModel'
import { createReminderFlexMessage } from '@/services/line/message_template/reminder_flex'

// リクエストボディの型定義
export type ReminderRequestBody = {
    tenant_id: string
    org_id: string
    line_user_id: string
    message_type: 'reminder'
    reservation_data: {
      id: string
      customer_name: string
      staff_name: string
      start_time_unix: number
      end_time_unix: number
      menus: ReservationMenu[]
      options: ReservationOption[]
      extra_charge: number
      coupon_discount: number
      use_points: number
      total_price: number
      org_name: string
    }
  }

// バリデーション結果の型定義
interface ValidationResult {
  isValid: boolean
  error?: string
}

/**
 * リクエストパラメータのバリデーション処理
 */
function validateRequestParams(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { isValid: false, error: 'Request body must be an object' }
  }

  const typedBody = body as Record<string, unknown>

  // 必須パラメータの存在チェック
  if (!typedBody.tenant_id) {
    return { isValid: false, error: 'tenant_id is required' }
  }
  if (!typedBody.org_id) {
    return { isValid: false, error: 'org_id is required' }
  }
  if (!typedBody.line_user_id) {
    return { isValid: false, error: 'line_user_id is required' }
  }
  if (!typedBody.message_type || typedBody.message_type !== 'reminder') {
    return { isValid: false, error: 'message_type must be "reminder"' }
  }
  if (!typedBody.reservation_data) {
    return { isValid: false, error: 'reservation_data is required' }
  }

  // reservation_dataの検証
  const reservationData = typedBody.reservation_data as Record<string, unknown>
  if (!reservationData.id || !reservationData.customer_name || !reservationData.staff_name || !reservationData.org_name) {
    return { isValid: false, error: 'reservation_data is missing required fields' }
  }
  
  // 時刻データの検証
  if (typeof reservationData.start_time_unix !== 'number' || reservationData.start_time_unix <= 0) {
    return { isValid: false, error: 'Invalid start_time_unix' }
  }
  if (typeof reservationData.end_time_unix !== 'number' || reservationData.end_time_unix <= 0) {
    return { isValid: false, error: 'Invalid end_time_unix' }
  }
  
  // 価格の検証
  if (typeof reservationData.total_price !== 'number' || reservationData.total_price < 0) {
    return { isValid: false, error: 'Invalid total_price' }
  }
  
  // メニューの検証
  if (!Array.isArray(reservationData.menus)) {
    return { isValid: false, error: 'menus must be an array' }
  }

  return { isValid: true }
}

/**
 * LINE リマインダー送信API
 */
export async function POST(request: Request) {
  console.log('POST /api/line/reminder called')
  
  try {
    // リクエストボディをパース
    const body = await request.json() as ReminderRequestBody
    console.log('Request body:', JSON.stringify(body, null, 2))
    const { tenant_id, org_id, line_user_id, reservation_data } = body
     
    // パラメータのバリデーション
    const validationResult = validateRequestParams(body)
    if (!validationResult.isValid) {
      console.error('Validation failed:', validationResult.error)
      return NextResponse.json({ success: false, error: validationResult.error }, { status: 400 })
    }
    
    // 組織情報を一括取得
    const relations = await fetchQuery(api.organization.query.getRelations, {
      tenant_id: tenant_id as Id<'tenant'>,
      org_id: org_id as Id<'organization'>
    })

    if (!relations || !relations.organization || !relations.config) {
      console.error('Organization or config not found')
      return NextResponse.json({
        success: false,
        error: 'Organization or config not found'
      }, { status: 404 })
    }

    if (!relations.apiConfig?.line_access_token) {
      console.error('LINE access token not configured')
      return NextResponse.json({
        success: false,
        error: 'LINE access token not configured' 
      }, { status: 400 })
    }
    
    // リマインダー用のFlex Messageを作成
    const messages = createReminderFlexMessage({
      organization: relations.organization,
      orgConfig: relations.config,
      reservationData: {
        id: reservation_data.id,
        customerName: reservation_data.customer_name,
        staffName: reservation_data.staff_name,
        startTimeUnix: reservation_data.start_time_unix,
        endTimeUnix: reservation_data.end_time_unix,
        menus: reservation_data.menus,
        options: reservation_data.options,
        extraCharge: reservation_data.extra_charge,
        couponDiscount: reservation_data.coupon_discount,
        usePoints: reservation_data.use_points,
        totalPrice: reservation_data.total_price,
        orgName: reservation_data.org_name
      }
    })

    const lineService = new LineService()
    const result = await lineService.sendFlexMessage(
      line_user_id,
      messages,
      relations.apiConfig.line_access_token
    )
    
    console.log('LINE reminder send result:', JSON.stringify(result, null, 2))

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Reminder sent successfully',
      })
    } else {
      console.error('LINE service returned error:', result.message)
      return NextResponse.json({ 
        success: false, 
        error: result.message 
      }, { status: 500 })
    }
  } catch (error: unknown) {
    console.error('Error in POST /api/line/reminder:', error)
    
    if (error instanceof Error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    } else {
      return NextResponse.json({
        success: false,
        error: '不明なエラーが発生しました',
      }, { status: 500 })
    }
  }
}