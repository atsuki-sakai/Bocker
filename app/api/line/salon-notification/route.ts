import { NextRequest, NextResponse } from 'next/server'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { LineService } from '@/services/line/LineService'
import { createSalonReservationNotification } from '@/services/line/message_template/salon_reservation_notification'

export async function POST(request: NextRequest) {
  try {
    const { tenantId, organizationId, reservationId, paymentMethod } = await request.json()

    if (!tenantId || !organizationId || !reservationId || !paymentMethod) {
      return NextResponse.json(
        { error: 'organizationId, reservationId, paymentMethod are required' },
        { status: 400 }
      )
    }

    // 環境変数から弊社のLINEチャンネル情報を取得
    const companyLineAccessToken = process.env.COMPANY_LINE_CHANNEL_ACCESS_TOKEN
    
    // デバッグ用ログ（本番環境では削除）
    console.log('Environment check:', {
      hasToken: !!companyLineAccessToken,
      tokenLength: companyLineAccessToken?.length || 0,
      tokenPrefix: companyLineAccessToken?.substring(0, 10) + '...',
      nodeEnv: process.env.NODE_ENV
    })

    // 弊社のLINEチャンネル情報を確認
    if (!companyLineAccessToken) {
      console.error('弊社LINEチャンネルのアクセストークンが設定されていません')
      return NextResponse.json(
        { error: 'Company LINE channel access token not configured' },
        { status: 500 }
      )
    }

    // 組織情報とAPIコンフィグを取得
    const [organization, apiConfig] = await Promise.all([
      fetchQuery(api.organization.query.findByOrgId, {
        org_id: organizationId as Id<'organization'>,
      }),
      fetchQuery(api.organization.api_config.query.findByTenantAndOrg, {
        tenant_id: tenantId as Id<'tenant'>,
        org_id: organizationId as Id<'organization'>,
      }),
    ])

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    if (!apiConfig?.org_line_id) {
      console.log(`組織 ${organization.org_name} にはorg_line_idが設定されていません`)
      return NextResponse.json({ success: true, message: 'No salon LINE ID configured' })
    }

    // 予約情報を取得
    const reservationWithDetail = await fetchQuery(api.reservation.query.getWithDetailById, {
      id: reservationId as Id<'reservation'>,
    })

    if (!reservationWithDetail) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    const { reservation, reservationDetail } = reservationWithDetail

    if (!reservation || !reservationDetail) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    // 顧客情報を取得（可能な場合）
    let customer: { phone?: string; email?: string; line_id?: string } | undefined = undefined
    if (reservation.customer_id) {
      try {
        // Supabaseから顧客情報を取得する場合
        // 今回は簡易的にreservationのデータを使用
        customer = {
          phone: undefined,
          email: undefined,
          line_id: undefined,
        }
      } catch (error) {
        console.warn('顧客情報の取得に失敗しました:', error)
      }
    }

    // サロン向けFlexメッセージを作成
    const salonFlexMessage = createSalonReservationNotification({
      organization,
      reservation: {
        _id: reservation._id,
        customer_name: reservation.customer_name,
        staff_name: reservation.staff_name || '指名フリー',
        date: reservation.date,
        start_time_unix: reservation.start_time_unix,
        end_time_unix: reservation.end_time_unix,
        status: reservation.status,
        payment_status: reservation.payment_status,
      },
      reservationDetail: {
        total_price: reservationDetail.total_price,
        payment_method: reservationDetail.payment_method,
        menus: reservationDetail.menus,
        options: reservationDetail.options || [],
        extra_charge: reservationDetail.extra_charge,
        coupon_discount: reservationDetail.coupon_discount,
        use_points: reservationDetail.use_points,
      },
      customer: customer || {},
      paymentMethod: paymentMethod as 'cash' | 'credit_card',
    })

    // LINEメッセージを送信
    const lineService = new LineService()
    const result = await lineService.sendFlexMessage(
      apiConfig.org_line_id,
      [salonFlexMessage],
      companyLineAccessToken
    )

    if (result.success) {
      console.log(`サロン通知送信成功: ${organization.org_name} (${apiConfig.org_line_id})`)
      return NextResponse.json({ success: true, message: 'Salon notification sent successfully' })
    } else {
      console.error(`サロン通知送信失敗: ${organization.org_name}`, result.message)
      return NextResponse.json(
        { error: 'Failed to send salon notification', details: result.message },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('サロン通知API処理エラー:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}