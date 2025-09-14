'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
/**
 * LINEログインコールバックページ
 *
 * LINE OAuth認証後のコールバックを適切に処理：
 * 1. URLパラメータ（code, state, error）を取得
 * 2. APIエンドポイントを呼び出してトークン交換
 * 3. 成功/エラーに応じた適切なUI表示
 * 4. 最終的なリダイレクト処理
 */

interface CallbackState {
  status: 'loading' | 'processing' | 'success' | 'error'
  message: string
  error?: {
    code: string
    description?: string
    details?: string
  }
  successData?: {
    line_user_id?: string
    line_name?: string
  }
}

export default function LineAuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [callbackState, setCallbackState] = useState<CallbackState>({
    status: 'loading',
    message: 'LINEログイン情報を処理中...',
  })

  useEffect(() => {
    const processCallback = async () => {
      try {
        // URLパラメータを取得
        const code = searchParams.get('code')
        const state = searchParams.get('state')
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        // LIFFのliff.stateパラメータも確認
        const liffState = searchParams.get('liff.state')
        let liffCode: string | null = null
        let liffStateParam: string | null = null

        if (liffState) {
          try {
            const decoded = decodeURIComponent(liffState)
            const queryString = decoded.startsWith('?') ? decoded.slice(1) : decoded
            const innerParams = new URLSearchParams(queryString)
            liffCode = innerParams.get('code')
            liffStateParam = innerParams.get('state')
          } catch (e) {
            console.warn('Failed to parse liff.state:', e)
          }
        }

        const effectiveCode = code || liffCode
        const effectiveState = state || liffStateParam

        console.log('[LineAuthCallback] Processing callback', {
          hasCode: !!effectiveCode,
          hasState: !!effectiveState,
          hasError: !!error,
          errorDescription,
          hasLiffState: !!liffState,
          liffParsed: !!liffCode || !!liffStateParam,
          url: window.location.href,
        })

        // エラーチェック
        if (error) {
          setCallbackState({
            status: 'error',
            message: 'LINEログインがキャンセルまたは拒否されました',
            error: {
              code: error,
              description: errorDescription || undefined,
            },
          })

          // ユーザーがキャンセルした場合は特別扱い
          if (error === 'access_denied') {
            toast.info('LINEログインがキャンセルされました')
            setTimeout(() => {
              router.push('/')
            }, 2000)
            return
          }

          toast.error('LINEログインでエラーが発生しました')
          return
        }

        // 必須パラメータの確認
        if (!effectiveCode || !effectiveState) {
          setCallbackState({
            status: 'error',
            message: '認証パラメータが不足しています',
            error: {
              code: 'missing_params',
              details: `Code: ${!!effectiveCode}, State: ${!!effectiveState}`,
            },
          })
          toast.error('認証パラメータが不足しています')
          return
        }

        // 処理中状態に更新
        setCallbackState({
          status: 'processing',
          message: 'LINEアカウント情報を取得中...',
        })

        // APIエンドポイントを呼び出してトークン交換
        const response = await fetch('/api/auth/line/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            code: effectiveCode,
            state: effectiveState,
          }),
        })

        const result = await response.json()

        if (!response.ok || !result.success) {
          // Log structured error details to help debugging
          // Includes server-side debug fields when available
          console.error('[LineAuthCallback] Server reported auth failure', {
            httpStatus: response.status,
            success: result?.success,
            error: result?.error,
            message: result?.message,
            debug: result?.debug,
          })
        }

        if (!response.ok) {
          throw new Error(result?.message || `HTTP ${response.status}`)
        }

        if (!result.success) {
          throw new Error(result?.message || 'Authentication failed')
        }

        // 成功処理
        setCallbackState({
          status: 'success',
          message: 'LINEログインが完了しました',
          successData: {
            line_user_id: result.line_user_id,
            line_name: result.line_name,
          },
        })

        // ここでアプリのセッションを作成（bocker_login_session）
        try {
          const sessRes = await fetch('/api/auth/line-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({}),
          })
          if (!sessRes.ok) {
            const errData = await sessRes.json().catch(() => ({}))
            console.warn('[LineAuthCallback] Session creation failed:', errData)
          }
        } catch (e) {
          console.warn('[LineAuthCallback] Session creation error:', e)
        }

        // Cookieの反映を少し待つ
        await new Promise((r) => setTimeout(r, 600))

        toast.success('LINEログインが完了しました')

        // 成功後のリダイレクト
        const redirectUrl = result.redirectUrl || '/reservation'
        router.push(redirectUrl)
      } catch (error) {
        console.error('[LineAuthCallback] Processing failed:', error)

        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        setCallbackState({
          status: 'error',
          message: 'ログイン処理でエラーが発生しました',
          error: {
            code: 'processing_error',
            details: errorMessage,
          },
        })

        toast.error('ログイン処理でエラーが発生しました')
      }
    }

    processCallback()
  }, [searchParams, router])

  const handleRetry = () => {
    router.push('/')
  }

  const handleManualRedirect = () => {
    router.push('/reservation')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="rounded-xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center">
          {callbackState.status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-green-600 mb-4" />
              <h1 className="text-xl font-semibold  mb-2">認証情報を確認中</h1>
              <p className="text-gray-600">{callbackState.message}</p>
            </>
          )}

          {callbackState.status === 'processing' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600 mb-4" />
              <h1 className="text-xl font-semibold  mb-2">ログイン処理中</h1>
              <p className="text-gray-600">{callbackState.message}</p>
            </>
          )}

          {callbackState.status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-4" />
              <h1 className="text-xl font-semibold  mb-2">ログイン完了</h1>
              <p className="text-gray-600 mb-4">{callbackState.message}</p>
            </>
          )}

          {callbackState.status === 'error' && (
            <>
              <AlertCircle className="h-12 w-12 mx-auto text-red-600 mb-4" />
              <h1 className="text-xl font-semibold  mb-2">ログインエラー</h1>
              <p className="text-gray-600 mb-4">{callbackState.message}</p>

              {process.env.NODE_ENV === 'development' && callbackState.error && (
                <div className="rounded-lg p-3 mb-4 text-left">
                  <p className="text-xs  font-mono">
                    <strong>エラーコード:</strong> {callbackState.error.code}
                  </p>
                  {callbackState.error.description && (
                    <p className="text-xs  font-mono mt-1">
                      <strong>説明:</strong> {callbackState.error.description}
                    </p>
                  )}
                  {callbackState.error.details && (
                    <p className="text-xs  font-mono mt-1">
                      <strong>詳細:</strong> {callbackState.error.details}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <Button onClick={handleRetry} variant="outline" className="w-full">
                  最初からやり直す
                </Button>
                <Button onClick={handleManualRedirect} className="w-full">
                  ログインせずに続行
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}
