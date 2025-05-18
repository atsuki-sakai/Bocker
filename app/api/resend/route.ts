import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const { to, subject, html, text } = await req.json()

    if (!to || !subject || (!html && !text)) {
      return NextResponse.json({ error: 'Missing required fields: to, subject, and html or text' }, { status: 400 })
    }

    if (!process.env.RESEND_API_KEY) {
        console.error('Resend APIキーが設定されていません。')
        return NextResponse.json({ error: 'Internal Server Error: Resend API key is missing' }, { status: 500 })
    }
    
    // 環境変数から送信元メールアドレスを取得 (例: no-reply@yourdomain.com)
    // 必ずResendに登録済みのドメインのメールアドレスを指定してください。
    const fromEmail = process.env.RESEND_FROM_EMAIL
    if (!fromEmail) {
        console.error('Resend送信元メールアドレスが設定されていません。')
        return NextResponse.json({ error: 'Internal Server Error: Resend from email is missing' }, { status: 500 })
    }


    const { data, error } = await resend.emails.send({
      from: fromEmail, // 例: 'Acme <onboarding@resend.dev>' 送信者名とメールアドレス
      to: [to],
      subject: subject,
      html: html,
      text: text,
    })

    if (error) {
      console.error('Resend APIエラー:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'メール送信に成功しました', data })
  } catch (error) {
    console.error('リクエスト処理中にエラーが発生しました:', error)
    // error が Error インスタンスであるか確認
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({ error: `Internal Server Error: ${errorMessage}` }, { status: 500 })
  }
}
