import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import { ContactEmail } from '@/components/emails/ReservationConfirmationEmail'
import React from 'react'
import { getEnv } from '@/lib/env-config'

const resend = new Resend(getEnv('RESEND_API_KEY'))

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { to, subject, templateProps } = body

    if (!to || !subject || !templateProps) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, and templateProps' },
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

    // Render the React component to an HTML string
    const emailHtml = await render(
      React.createElement(ContactEmail, templateProps)
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

    return NextResponse.json({ message: 'メール送信に成功しました', data })
  } catch (error) {
    console.error('リクエスト処理中にエラーが発生しました:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({ error: `Internal Server Error: ${errorMessage}` }, { status: 500 })
  }
}
