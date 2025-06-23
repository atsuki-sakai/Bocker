import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import ReservationReminderEmail from '@/components/emails/ReservationReminderEmail'
import React from 'react'
import { getEnv } from '@/lib/env-config'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

const resend = new Resend(getEnv('RESEND_API_KEY'))

interface ReminderRequestBody {
  type: 'reminder'
  to: string
  subject: string
  customerData: {
    name: string
    email: string
  }
  reservationData: {
    id: string
    customer_name: string
    staff_name: string
    start_time_unix: number
    end_time_unix: number
    menus: Array<{ name: string; duration_min?: number }>
    options?: Array<{ name: string; quantity: number }>
    extra_charge?: number
    coupon_discount?: number
    use_points?: number
    total_price: number
    org_name?: string
  }
  organizationData?: {
    name: string
    address?: string
    phone?: string
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as ReminderRequestBody
    const { to, subject, customerData, reservationData, organizationData } = body

    if (!to || !subject || !customerData || !reservationData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // メールアドレスの検証
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }
    
    // 時刻データの検証
    if (typeof reservationData.start_time_unix !== 'number' || reservationData.start_time_unix <= 0) {
      return NextResponse.json(
        { error: 'Invalid start_time_unix' },
        { status: 400 }
      )
    }
    if (typeof reservationData.end_time_unix !== 'number' || reservationData.end_time_unix <= 0) {
      return NextResponse.json(
        { error: 'Invalid end_time_unix' },
        { status: 400 }
      )
    }

    if (!getEnv('RESEND_API_KEY')) {
      console.error('Resend APIキーが設定されていません。')
      return NextResponse.json(
        { error: 'Internal Server Error: Resend API key is missing' },
        { status: 500 }
      )
    }

    const fromEmail = getEnv('RESEND_FROM_EMAIL')
    if (!fromEmail) {
      console.error('Resend送信元メールアドレスが設定されていません。')
      return NextResponse.json(
        { error: 'Internal Server Error: Resend from email is missing' },
        { status: 500 }
      )
    }

    // 日時のフォーマット
    const startDate = new Date(reservationData.start_time_unix)
    const endDate = new Date(reservationData.end_time_unix)
    const reservationDate = format(startDate, 'yyyy年MM月dd日', { locale: ja })
    const startTime = format(startDate, 'HH:mm')
    const endTime = format(endDate, 'HH:mm')

    // メールプロパティの準備
    const emailProps = {
      customerName: customerData.name,
      organizationName: organizationData?.name || 'サロン',
      reservationDate,
      startTime,
      endTime,
      menus: reservationData.menus,
      options: reservationData.options,
      staffName: reservationData.staff_name,
      extraCharge: reservationData.extra_charge,
      couponDiscount: reservationData.coupon_discount,
      usePoints: reservationData.use_points,
      totalPrice: reservationData.total_price,
      reservationId: reservationData.id,
      orgAddress: organizationData?.address,
      orgPhone: organizationData?.phone,
    }

    // React componentをHTML文字列にレンダリング
    const emailHtml = await render(
      React.createElement(ReservationReminderEmail, emailProps)
    ) as string

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: subject,
      html: emailHtml,
    })

    if (error) {
      console.error('Resend APIエラー:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('Reminder email sent successfully:', data)

    return NextResponse.json({ 
      success: true,
      message: 'リマインダーメール送信に成功しました', 
      data 
    })
  } catch (error) {
    console.error('リマインダーメール送信中にエラーが発生しました:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({ 
      success: false,
      error: `Internal Server Error: ${errorMessage}` 
    }, { status: 500 })
  }
}