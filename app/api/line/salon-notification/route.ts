import { NextRequest, NextResponse } from 'next/server'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { createSalonReservationNotification } from '@/services/line/message_template/salon_reservation_notification'
import { sendLineFlexMessageOrThrow } from '@/services/line/sendLineFlexMessageOrThrow'

export async function POST(request: NextRequest) {
  try {
    const { tenantId, organizationId, reservationId } = await request.json()

    if (!tenantId || !organizationId || !reservationId) {
      return NextResponse.json(
        { error: 'tenantId, organizationId and reservationId are required' },
        { status: 400 }
      )
    }

    // 組織情報・APIコンフィグ・予約情報を取得
    const [organization, apiConfig, reservationWithDetail] = await Promise.all([
      fetchQuery(api.organization.query.findByOrgId, {
        org_id: organizationId as Id<'organization'>,
      }),
      fetchQuery(api.organization.api_config.query.findByTenantAndOrg, {
        tenant_id: tenantId as Id<'tenant'>,
        org_id: organizationId as Id<'organization'>,
      }),
      fetchQuery(api.reservation.query.getWithDetailById, {
        id: reservationId as Id<'reservation'>,
      }),
    ])

    if (!organization || organization.tenant_id !== tenantId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    if (!apiConfig?.org_line_id) {
      console.log(`組織 ${organization.org_name} にはorg_line_idが設定されていません`)
      return NextResponse.json({ success: true, message: 'No salon LINE ID configured' })
    }

    if (!reservationWithDetail) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    const { reservation, reservationDetail } = reservationWithDetail

    if (!reservation || !reservationDetail) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    if (reservation.tenant_id !== tenantId || reservation.org_id !== organizationId) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    if (!apiConfig.line_access_token) {
      console.error(`組織 ${organization.org_name} のLINEアクセストークンが設定されていません`)
      return NextResponse.json(
        { error: 'Tenant LINE channel access token not configured' },
        { status: 500 }
      )
    }

    const paymentMethod = reservationDetail.payment_method

    if (paymentMethod !== 'cash' && paymentMethod !== 'credit_card') {
      return NextResponse.json({ error: 'Invalid reservation payment method' }, { status: 500 })
    }

    // 顧客情報を取得（可能な場合）
    let customer: { phone?: string; email?: string; line_id?: string } | undefined = undefined
    if (reservation.customer_uid) {
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
        staff_name: reservation.is_free_nomination
          ? reservation.assigned_staff_name || reservation.staff_name || '指名フリー'
          : reservation.staff_name || '不明',
        date: reservation.date,
        start_time_unix: reservation.start_time_unix,
        end_time_unix: reservation.end_time_unix,
        status: reservation.status,
        payment_status: reservation.payment_status,
        is_free_nomination: reservation.is_free_nomination ?? false,
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
      paymentMethod,
    })

    // LINEメッセージを送信
    await sendLineFlexMessageOrThrow({
      lineId: apiConfig.org_line_id,
      messages: [salonFlexMessage],
      accessToken: apiConfig.line_access_token,
    })

    console.log(`サロン通知送信成功: ${organization.org_name} (${apiConfig.org_line_id})`)
    return NextResponse.json({ success: true, message: 'Salon notification sent successfully' })
  } catch (error) {
    console.error('サロン通知API処理エラー:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
