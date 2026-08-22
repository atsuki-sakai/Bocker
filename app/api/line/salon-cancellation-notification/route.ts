import { NextRequest, NextResponse } from 'next/server'
import { createSalonCancellationNotification } from '@/services/line/message_template/cancellation_flex'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
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

    // リクエスト本文を通知内容として信用せず、テナント・組織・予約に紐づく情報を取得
    const [organization, reservationWithDetail] = await Promise.all([
      fetchQuery(api.organization.query.getRelations, {
        tenant_id: tenantId as Id<'tenant'>,
        org_id: organizationId as Id<'organization'>,
      }),
      fetchQuery(api.reservation.query.getWithDetailById, {
        id: reservationId as Id<'reservation'>,
      }),
    ])

    if (!organization.organization || !organization.apiConfig) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    if (
      !reservationWithDetail?.reservation ||
      !reservationWithDetail.reservationDetail ||
      reservationWithDetail.reservation.tenant_id !== tenantId ||
      reservationWithDetail.reservation.org_id !== organizationId
    ) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    const { reservation, reservationDetail } = reservationWithDetail

    // サロン向けキャンセル通知Flexメッセージを作成
    const salonCancellationMessage = createSalonCancellationNotification({
      organization: organization.organization,
      reservationData: {
        reservationId: reservation._id,
        customerName: reservation.customer_name,
        staffName: reservation.staff_name || '不明なスタッフ',
        date: reservation.date,
        startTimeUnix: reservation.start_time_unix,
        endTimeUnix: reservation.end_time_unix,
        menus: reservationDetail.menus || [],
        options: reservationDetail.options || [],
        totalPrice: reservationDetail.total_price || 0,
        cancelledBy: reservation.cancelled_by || 'system',
        cancelReason: reservation.cancel_reason || '',
      },
    })

    // LINEメッセージを送信
    if (!organization.apiConfig.org_line_id) {
      console.log(`組織 ${organization.organization.org_name} にはLINE送信先IDが設定されていません`)
      return NextResponse.json({ success: true, message: 'No salon LINE ID configured' })
    }

    if (!organization.apiConfig.line_access_token) {
      return NextResponse.json(
        { error: 'Tenant LINE channel access token not configured' },
        { status: 500 }
      )
    }

    await sendLineFlexMessageOrThrow({
      lineId: organization.apiConfig.org_line_id,
      messages: [salonCancellationMessage],
      accessToken: organization.apiConfig.line_access_token,
    })

    console.log(`サロンキャンセル通知送信成功: ${organization.organization.org_name} (${organization.apiConfig.org_line_id})`)
    return NextResponse.json({ success: true, message: 'Salon cancellation notification sent successfully' })
  } catch (error) {
    console.error('サロンキャンセル通知API処理エラー:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
