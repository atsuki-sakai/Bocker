import { NextRequest, NextResponse } from 'next/server'
import { LineService } from '@/services/line/LineService'
import { createCustomerCancellationNotification } from '@/services/line/message_template/cancellation_flex'
import { CustomerRepository } from '@/services/supabase/repositories/customer/CustomerRepository'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'

export async function POST(request: NextRequest) {
  try {
    const { tenantId, organizationId, customerUid, cancelData } = await request.json()

    if (!tenantId || !organizationId || !customerUid || !cancelData) {
      return NextResponse.json(
        { error: 'tenantId, organizationId, customerUid, cancelData are required' },
        { status: 400 }
      )
    }

    // 顧客情報を取得
    const customerRepo = new CustomerRepository()
    const customerData = await customerRepo.getCompleteCustomerData(
      customerUid,
      tenantId,
      organizationId
    )

    if (!customerData.customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // 顧客にLINE IDがない場合はスキップ
    if (!customerData.customer.line_id) {
      console.log(`顧客 ${customerData.customer.uid} にはLINE IDが設定されていません`)
      return NextResponse.json({ success: true, message: 'No customer LINE ID configured' })
    }

    // 組織の完全な情報を取得（サロン側APIと同じ方法）
    const organizationComplete = await fetchQuery(api.organization.query.getRelations, {
      tenant_id: tenantId as Id<'tenant'>,
      org_id: organizationId as Id<'organization'>,
    })

    if (!organizationComplete.organization || !organizationComplete.apiConfig) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    if (!organizationComplete.apiConfig.line_access_token) {
      console.log(`組織 ${organizationComplete.organization.org_name} にはLINEアクセストークンが設定されていません`)
      return NextResponse.json({ success: true, message: 'No LINE access token configured' })
    }

    if (!organizationComplete.config) {
      return NextResponse.json({ error: 'Organization config not found' }, { status: 404 })
    }

    // 顧客向けキャンセル通知Flexメッセージを作成
    let customerName = [customerData.customer.first_name, customerData.customer.last_name]
      .filter(Boolean)
      .join(' ') || '不明'
    customerName = customerName === "不明" ? customerData.customer.email || customerData.customer.line_user_name || "お客様" : customerName

    const customerCancellationMessages = createCustomerCancellationNotification({
      organization: organizationComplete.organization,
      orgConfig: organizationComplete.config,
      customerName,
      customerUid: customerData.customer.uid,
      orgId: organizationId,
      reservationData: {
        reservationId: cancelData.reservationId,
        date: cancelData.date,
        startTimeUnix: cancelData.startTimeUnix,
        endTimeUnix: cancelData.endTimeUnix,
        staffName: cancelData.staffName,
        menus: cancelData.menus,
        options: cancelData.options,
        totalPrice: cancelData.totalPrice,
        cancelledBy: cancelData.cancelledBy,
        cancelReason: cancelData.cancelReason,
      },
    })

    // LINEメッセージを送信
    let result: { success: boolean; message: string } = { success: false, message: 'No customer LINE ID configured' }
    if(customerData.customer.line_id !== "") {
        const lineService = new LineService()
        result = await lineService.sendFlexMessage(
        customerData.customer.line_id,
        customerCancellationMessages,
        organizationComplete.apiConfig.line_access_token
        )
    }

    if (result.success) {
      console.log(`顧客キャンセル通知送信成功: ${customerName} (${customerData.customer.line_id})`)
      return NextResponse.json({ success: true, message: 'Customer cancellation notification sent successfully' })
    } else {
      console.error(`顧客キャンセル通知送信失敗: ${customerName}`, result.message)
      return NextResponse.json(
        { error: 'Failed to send customer cancellation notification', details: result.message },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('顧客キャンセル通知API処理エラー:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 