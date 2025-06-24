'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Link } from '@/i18n/navigation'
import { useLiff } from '@/hooks/useLiff'
import { useRouter } from 'next/navigation'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { toast } from 'sonner'
import { batchAuthProcessing } from '@/lib/auth/batchProcessor'

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, ExternalLink } from 'lucide-react'

interface StateData {
  tenantId: string
  orgId: string
  isCustomerLogin?: boolean
}

export default function ReserveRedirectPage() {
  const {
    liff,
    isLoading: liffIsLoading,
    isError: liffIsError,
    errorMessage: liffErrorMessage,
  } = useLiff()
  const router = useRouter()
  const { showErrorToast } = useErrorHandler()
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [hasProcessed, setHasProcessed] = useState(false)

  // タイムアウト用のRef（setTimeoutのIDを保持）
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // リトライ回数管理用のRef
  const abortControllerRef = useRef<AbortController | null>(null)
  const MAX_RETRY_COUNT = 3
  const RETRY_DELAY = 1000 // 1秒

  // 現在の言語設定を取得
  const locale =
    typeof window !== 'undefined' ? window.location.pathname.split('/')[1] || 'ja' : 'ja'

  // URLパラメータからstateデータを抽出する関数
  const extractStateFromUrl = useCallback((): StateData | null => {
    const urlParams = new URLSearchParams(window.location.search)
    let stateId: string | null = null
    let tenantId: string | null = null
    let orgId: string | null = null

    // liffRedirectUriパラメータから実際のstate IDを抽出
    const liffRedirectUri = urlParams.get('liffRedirectUri')
    if (liffRedirectUri) {
      try {
        const decodedUri = decodeURIComponent(liffRedirectUri)
        const redirectUrl = new URL(decodedUri)
        const liffState = redirectUrl.searchParams.get('liff.state')

        if (liffState) {
          const innerSearchParams = new URLSearchParams(liffState.split('?')[1])
          stateId = innerSearchParams.get('state')
          tenantId = innerSearchParams.get('tid')
          orgId = innerSearchParams.get('oid')
        }
      } catch (e) {
        console.error('[ReserveRedirectPage] Failed to parse liffRedirectUri:', e)
      }
    }

    // フォールバック: 直接stateパラメータをチェック
    if (!stateId) {
      stateId = urlParams.get('state')
    }

    return {
      tenantId: tenantId || '',
      orgId: orgId || '',
      isCustomerLogin: false,
    }
  }, [])

  // state検証を行う関数（リトライ機能付き）
  const validateStateWithRetry = useCallback(
    async (stateId: string | null, controller: AbortController): Promise<StateData | null> => {
      for (let attempt = 0; attempt < MAX_RETRY_COUNT; attempt++) {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY))
        }

        try {
          const url = stateId
            ? `/api/auth/line-state?stateId=${stateId}`
            : '/api/auth/line-state?skipValidation=true'

          const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            signal: controller.signal,
          })

          if (response.ok) {
            return await response.json()
          }

          // state IDが一致しない場合、検証をスキップして再試行
          if (!response.ok && stateId && attempt < MAX_RETRY_COUNT - 1) {
            console.log('[ReserveRedirectPage] Retrying with skipValidation=true')
            const retryResponse = await fetch('/api/auth/line-state?skipValidation=true', {
              method: 'GET',
              credentials: 'include',
              signal: controller.signal,
            })

            if (retryResponse.ok) {
              return await retryResponse.json()
            }
          }
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            throw error
          }
          console.error(`[ReserveRedirectPage] Attempt ${attempt + 1} failed:`, error)
        }
      }

      return null
    },
    []
  )

  // トークン検証を行う関数（リトライ機能付き）
  const verifyTokenWithRetry = useCallback(
    async (
      idToken: string,
      tenantId: string,
      orgId: string,
      controller: AbortController
    ): Promise<boolean> => {
      for (let attempt = 0; attempt < MAX_RETRY_COUNT; attempt++) {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY))
        }

        try {
          const response = await fetch('/api/line/verify-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              idToken,
              tenantId,
              orgId,
            }),
            signal: controller.signal,
          })

          const data = await response.json()

          if (response.ok && data.success) {
            return true
          }

          // トークン期限切れの場合、新しいトークンを取得して再試行
          if (
            data.error === 'token_expired' &&
            liff?.isLoggedIn() &&
            attempt < MAX_RETRY_COUNT - 1
          ) {
            console.log(
              `[ReserveRedirectPage] Token expired, getting new token (attempt ${attempt + 2})...`
            )
            const newIdToken = liff.getIDToken()
            if (newIdToken && newIdToken !== idToken) {
              idToken = newIdToken
              continue
            }
          }

          throw new Error(data.message || data.error || 'LINE認証に失敗しました')
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            throw error
          }
          if (attempt === MAX_RETRY_COUNT - 1) {
            throw error
          }
          console.error(
            `[ReserveRedirectPage] Token verification attempt ${attempt + 1} failed:`,
            error
          )
        }
      }

      return false
    },
    [liff]
  )

  useEffect(() => {
    async function handleLiffLogin() {
      // 既に処理済みの場合は早期リターン
      if (hasProcessed) {
        console.log('[ReserveRedirectPage] Already processed, skipping...')
        return
      }

      // LIFF初期化中はまだ処理しない
      if (liffIsLoading) {
        console.log('[ReserveRedirectPage] LIFF is still loading. Waiting...')
        return
      }

      // LIFFエラーチェック
      if (liffIsError) {
        console.error(`[ReserveRedirectPage] LIFF initialization error: ${liffErrorMessage}`)
        setErrorMessage(`LINE連携でエラーが発生しました: ${liffErrorMessage || '不明なエラー'}`)
        setIsLoading(false)
        setHasProcessed(true)
        return
      }

      // LIFF初期化が完了していない場合は早期リターン
      if (!liff) {
        console.log(
          '[ReserveRedirectPage] LIFF is not initialized yet. Waiting for initialization...'
        )
        return
      }

      setIsLoading(true)
      setErrorMessage(null)

      // 新しいAbortControllerを作成
      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        // URLからstateデータを抽出
        const extractedData = extractStateFromUrl()
        const urlParams = new URLSearchParams(window.location.search)
        const stateId =
          urlParams.get('state') ||
          (urlParams.get('liffRedirectUri')
            ? new URLSearchParams(
                new URL(decodeURIComponent(urlParams.get('liffRedirectUri') || '')).searchParams
                  .get('liff.state')
                  ?.split('?')[1] || ''
              ).get('state')
            : null)

        // state検証（バッチ処理で最適化）
        const stateValidationTasks = [
          {
            name: 'validateState',
            task: () => validateStateWithRetry(stateId, controller),
            priority: 3,
          },
        ]

        const validationResults = await batchAuthProcessing(stateValidationTasks)
        let stateData = validationResults.get('validateState') as StateData | null

        // URLから抽出したデータとマージ
        if (!stateData && extractedData && extractedData.tenantId && extractedData.orgId) {
          stateData = extractedData
        }

        if (!stateData || !stateData.tenantId || !stateData.orgId) {
          throw new Error('サロン情報が見つかりません。予約フローを最初からやり直してください')
        }

        const { tenantId, orgId } = stateData
        console.log('[ReserveRedirectPage] State data retrieved:', { tenantId, orgId })

        const computedRedirectUrl = `/${locale}/reservation/${orgId}/calendar`
        setRedirectUrl(computedRedirectUrl)

        // LINEログイン処理
        if (liff && liff.isLoggedIn()) {
          console.log('[ReserveRedirectPage] LIFF is logged in.')
          let idToken: string | null = null

          try {
            idToken = liff.getIDToken()
          } catch (e) {
            console.error('[ReserveRedirectPage] Error getting ID token:', e)
            throw new Error('LINE認証情報の取得に失敗しました')
          }

          if (!idToken) {
            console.error('[ReserveRedirectPage] Could not get ID Token from LIFF')
            throw new Error('LINE情報の取得に失敗しました。ログインし直してください')
          }

          console.log('[ReserveRedirectPage] Got idToken. Verifying...')

          // トークン検証（リトライ機能付き）
          const success = await verifyTokenWithRetry(idToken, tenantId, orgId, controller)

          if (success) {
            console.log('[ReserveRedirectPage] Authentication successful. Redirecting...')
            toast.success('認証に成功しました。予約ページへ移動します')
            setHasProcessed(true)
            router.push(computedRedirectUrl)
          } else {
            throw new Error('認証サーバーとの通信に失敗しました')
          }
        } else if (liff && !liffIsLoading) {
          console.log('[ReserveRedirectPage] LIFF is not logged in. Initiating LIFF login.')
          liff.login({
            redirectUri: window.location.href,
          })
        } else {
          console.log('[ReserveRedirectPage] LIFF not ready, waiting...')
        }
      } catch (error) {
        console.error('[ReserveRedirectPage] Error in handleLiffLogin:', error)

        if (error instanceof Error && error.name === 'AbortError') {
          setErrorMessage('処理がキャンセルされました')
        } else {
          setErrorMessage(
            error instanceof Error ? error.message : '認証処理中にエラーが発生しました'
          )
          showErrorToast(error)
        }

        setIsLoading(false)
        setHasProcessed(true)
      }
    }

    handleLiffLogin()
  }, [
    liff,
    liffIsLoading,
    liffIsError,
    liffErrorMessage,
    hasProcessed,
    locale,
    router,
    showErrorToast,
    extractStateFromUrl,
    validateStateWithRetry,
    verifyTokenWithRetry,
  ])

  // クリーンアップ: アンマウント時にAbortControllerをキャンセル
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // タイムアウト処理（最適化版）
  useEffect(() => {
    if (isLoading) {
      timeoutRef.current = setTimeout(async () => {
        console.warn('[ReserveRedirectPage] Loading timeout exceeded. Cleaning up...')

        // AbortControllerでリクエストをキャンセル
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }

        // バッチ処理でログアウト
        const logoutTasks = [
          {
            name: 'serverLogout',
            task: () => fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }),
            priority: 1,
          },
          {
            name: 'liffLogout',
            task: async () => {
              if (liff?.isLoggedIn()) {
                liff.logout()
              }
              return Promise.resolve()
            },
            priority: 2,
          },
        ]

        await batchAuthProcessing(logoutTasks)

        toast.error('タイムアウトしました。再度ログインしてください')
        setIsLoading(false)
        setHasProcessed(true)

        setTimeout(() => {
          router.push(`/${locale}/reservation`)
        }, 2000)
      }, 30000) // 30秒
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [isLoading, liff, router, locale])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="flex flex-col items-center bg-muted justify-center space-y-6 py-6">
            <div className="relative">
              <Loader2 className="h-12 w-12 text-neon animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-6 w-6 rounded-full bg-accent animate-pulse"></div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-6 py-6">
            <p className="text-center text-primary font-medium animate-pulse">
              認証情報を確認中...
            </p>
            <p className="text-center text-sm text-muted-foreground max-w-xs">
              LINEアカウント情報を確認し、安全にログイン処理を行っています。
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md shadow-lg border-destructive">
          <CardContent className="flex flex-col items-center justify-center space-y-4 py-6">
            <p className="text-center text-destructive font-semibold">エラーが発生しました</p>
            <p className="text-center text-sm text-muted-foreground max-w-xs">{errorMessage}</p>
            <Button variant="outline" onClick={() => router.push(`/${locale}/reservation`)}>
              予約トップに戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-lg border-none">
        <CardContent className="flex flex-col items-center justify-center space-y-6 py-6">
          <p className="text-center text-primary font-medium">処理が完了しました</p>
          <p className="text-center text-sm text-muted-foreground max-w-xs">
            まもなく予約ページへ移動します。
          </p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3 pt-0">
          <div className="text-xs text-muted-foreground text-center">
            画面が切り替わらない場合は下のボタンをクリックしてください
          </div>
          <Button
            variant="default"
            className="w-full flex items-center justify-center gap-2 transition-all"
            asChild
          >
            <Link href={redirectUrl ?? '#'}>
              <span className=" font-bold">予約ページへ移動</span>
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
