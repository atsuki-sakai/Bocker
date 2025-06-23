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
    total_price: number
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
      staffName: reservationData.staff_name,
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