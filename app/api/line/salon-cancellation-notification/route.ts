import { NextRequest, NextResponse } from 'next/server'
import { LineService } from '@/services/line/LineService'
import { createSalonCancellationNotification } from '@/services/line/message_template/cancellation_flex'
import { getEnv } from '@/lib/env-config'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

export async function POST(request: NextRequest) {
  try {
    const { tenantId, organizationId, reservationId, cancelData } = await request.json()

    if (!tenantId || !organizationId || !reservationId || !cancelData) {
      return NextResponse.json(
        { error: 'tenantId, organizationId, reservationId, cancelData are required' },
        { status: 400 }
      )
    }

    // 環境変数から弊社のLINEチャンネル情報を取得
    const companyLineAccessToken = getEnv("COMPANY_LINE_CHANNEL_ACCESS_TOKEN")
    
    if (!companyLineAccessToken) {
      console.error('弊社LINEチャンネルのアクセストークンが設定されていません')
      return NextResponse.json(
        { error: 'Company LINE channel access token not configured' },
        { status: 500 }
      )
    }

    // 組織情報とAPIコンフィグを取得するためのダミー実装
    // 実際の実装では、データベースから適切に取得する
    const organization = await fetchQuery(api.organization.query.getRelations, {
      tenant_id: tenantId as Id<'tenant'>,
      org_id: organizationId as Id<'organization'>,
    })

    if (!organization.organization || !organization.apiConfig) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
    // サロン向けキャンセル通知Flexメッセージを作成
    const salonCancellationMessage = createSalonCancellationNotification({
      organization: organization.organization,
      reservationData: {
        reservationId: cancelData.reservationId,
        customerName: cancelData.customerName,
        staffName: cancelData.staffName,
        date: cancelData.date,
        startTimeUnix: cancelData.startTimeUnix,
        endTimeUnix: cancelData.endTimeUnix,
        menus: cancelData.menus,
        options: cancelData.options,
        totalPrice: cancelData.totalPrice,
        cancelledBy: cancelData.cancelledBy,
        cancelReason: cancelData.cancelReason,
      },
    })

    // LINEメッセージを送信
    if (!organization.apiConfig.org_line_id) {
      console.log(`組織 ${organization.organization.org_name} にはLINEアクセストークンが設定されていません`)
      return NextResponse.json({ success: true, message: 'No LINE access token configured' })
    }

    const lineService = new LineService()
    const result = await lineService.sendFlexMessage(
      organization.apiConfig.org_line_id,
      [salonCancellationMessage],
      companyLineAccessToken
    )

    if (result.success) {
      console.log(`サロンキャンセル通知送信成功: ${organization.organization.org_name} (${organization.apiConfig.org_line_id})`)
      return NextResponse.json({ success: true, message: 'Salon cancellation notification sent successfully' })
    } else {
      console.error(`サロンキャンセル通知送信失敗: ${organization.organization.org_name}`, result.message)
      return NextResponse.json(
        { error: 'Failed to send salon cancellation notification', details: result.message },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('サロンキャンセル通知API処理エラー:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 