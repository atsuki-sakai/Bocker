import { NextRequest, NextResponse } from 'next/server'
import Sentry from '@sentry/nextjs'
import { LineService } from '@/services/line/LineService'
import { validateRequest, createValidationErrorResponse } from '@/lib/api/validation'
import { lineMessageRequestSchema } from '@/lib/validations/api'

export async function POST(request: NextRequest) {
  try {
    // リクエストボディのバリデーション
    const validation = await validateRequest(request, lineMessageRequestSchema)
    if (!validation.success) {
      return createValidationErrorResponse(validation.error)
    }

    const { lineId, message, accessToken } = validation.data

    // LINEサービスの初期化
    const lineService = new LineService()

    // メッセージ送信
    const result = await lineService.sendMessage(lineId, message, accessToken)

    // 送信成功
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('LINE message API error:', error)
    
    // Sentryでエラー追跡
    Sentry.captureException(error, {
      tags: {
        api: 'line-message',
        action: 'send-message'
      }
    })

    // エラーレスポンス
    if (error instanceof Error) {
      // LINE APIからのエラー
      if (error.message.includes('Invalid access token')) {
        return NextResponse.json({ success: false, error: 'アクセストークンが無効です' }, { status: 401 })
      }
      if (error.message.includes('User not found')) {
        return NextResponse.json({ success: false, error: 'ユーザーが見つかりません' }, { status: 404 })
      }
      
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    } else {
      return NextResponse.json({ success: false, error: '不明なエラー' }, { status: 500 })
    }
  }
}