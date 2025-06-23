'use client'

import { useEffect, useState, useRef } from 'react'
import { Link } from '@/i18n/navigation'
import { useLiff } from '@/hooks/useLiff'
import { useRouter } from 'next/navigation'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { toast } from 'sonner'

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, ExternalLink } from 'lucide-react'

export default function ReserveRedirectPage() {
  const {
    liff,
    isLoggedIn: liffIsLoggedIn,
    profile: liffProfile,
    isLoading: liffIsLoading,
    isError: liffIsError,
    errorMessage: liffErrorMessage,
  } = useLiff()
  const router = useRouter()
  const { showErrorToast } = useErrorHandler()
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // タイムアウト用のRef（setTimeoutのIDを保持）
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 現在の言語設定を取得
  const locale =
    typeof window !== 'undefined' ? window.location.pathname.split('/')[1] || 'ja' : 'ja'

  useEffect(() => {
    async function handleLiffLogin() {
      // LIFF初期化中はまだ処理しない
      if (liffIsLoading) {
        console.log('[ReserveRedirectPage] LIFF is still loading. Waiting...')
        return
      }
      console.log('liffIsLoading', liffIsLoading)
      // LIFFエラーチェック
      if (liffIsError) {
        console.error(`[ReserveRedirectPage] LIFF initialization error: ${liffErrorMessage}`)
        setErrorMessage(`LINE連携でエラーが発生しました: ${liffErrorMessage || '不明なエラー'}`)
        setIsLoading(false)
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

      // URLからstate IDを取得
      const urlParams = new URLSearchParams(window.location.search)
      console.log('[ReserveRedirectPage] All URL params:', Object.fromEntries(urlParams))

      let stateId: string | null = null
      // 解析途中で参照されるため先に宣言
      let tenantIdFromSession: string | null = null
      let orgIdFromSession: string | null = null

      // liffRedirectUriパラメータから実際のstate IDを抽出
      const liffRedirectUri = urlParams.get('liffRedirectUri')
      console.log('[ReserveRedirectPage] liffRedirectUri:', liffRedirectUri)
      if (liffRedirectUri) {
        try {
          const decodedUri = decodeURIComponent(liffRedirectUri)
          console.log('[ReserveRedirectPage] Decoded liffRedirectUri:', decodedUri)
          const redirectUrl = new URL(decodedUri)
          const liffState = redirectUrl.searchParams.get('liff.state')
          console.log('[ReserveRedirectPage] liff.state:', liffState)

          if (liffState) {
            // liff.state のクエリをパースし、本来の state / tid / oid を取得
            const innerSearchParams = new URLSearchParams(liffState.split('?')[1])
            const innerState = innerSearchParams.get('state')
            const innerTid = innerSearchParams.get('tid')
            const innerOid = innerSearchParams.get('oid')

            if (innerState) {
              stateId = innerState
              console.log('[ReserveRedirectPage] Extracted state ID from liffRedirectUri:', stateId)
            }

            if (innerTid) {
              console.log(
                '[ReserveRedirectPage] Extracted tenantId from liffRedirectUri:',
                innerTid
              )
              tenantIdFromSession = innerTid
            }

            if (innerOid) {
              console.log('[ReserveRedirectPage] Extracted orgId from liffRedirectUri:', innerOid)
              orgIdFromSession = innerOid
            }
          }
        } catch (e) {
          console.error('[ReserveRedirectPage] Failed to parse liffRedirectUri:', e)
        }
      }

      // フォールバック: 直接stateパラメータをチェック（将来の互換性のため）
      if (!stateId) {
        const directState = urlParams.get('state')
        console.log('[ReserveRedirectPage] Direct state param:', directState)
        stateId = directState
      }

      console.log('[ReserveRedirectPage] Final state ID:', stateId)

      // state IDが取得できた場合は通常の検証を試みる
      if (stateId) {
        // セキュアなstate検証APIを呼び出し
        try {
          const stateResponse = await fetch(`/api/auth/line-state?stateId=${stateId}`, {
            method: 'GET',
            credentials: 'include',
          })

          if (!stateResponse.ok) {
            const error = await stateResponse.json()
            console.error('[ReserveRedirectPage] State validation failed:', error)

            // state IDが一致しない場合、検証をスキップして再試行
            console.log('[ReserveRedirectPage] Retrying with skipValidation=true')
            const retryResponse = await fetch(`/api/auth/line-state?skipValidation=true`, {
              method: 'GET',
              credentials: 'include',
            })

            if (!retryResponse.ok) {
              if (tenantIdFromSession && orgIdFromSession) {
                console.warn(
                  '[ReserveRedirectPage] SkipValidation failed but IDs extracted from liffRedirectUri. Proceeding with fallback IDs.'
                )
              } else {
                throw new Error('State validation failed even with skip validation')
              }
            } else {
              const retryData = await retryResponse.json()
              tenantIdFromSession = retryData.tenantId
              orgIdFromSession = retryData.orgId
              console.log('[ReserveRedirectPage] Retrieved data with skipValidation:', {
                tenantIdFromSession,
                orgIdFromSession,
                originalStateId: retryData.originalStateId,
              })
            }
          } else {
            const stateData = await stateResponse.json()
            tenantIdFromSession = stateData.tenantId
            orgIdFromSession = stateData.orgId

            console.log('[ReserveRedirectPage] State validated successfully:', {
              tenantIdFromSession,
              orgIdFromSession,
            })
          }
        } catch (e) {
          console.error('[ReserveRedirectPage] Failed to validate state:', e)

          // 最後の手段として、クッキーから直接取得を試みる
          try {
            const fallbackResponse = await fetch(`/api/auth/line-state?skipValidation=true`, {
              method: 'GET',
              credentials: 'include',
            })

            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json()
              tenantIdFromSession = fallbackData.tenantId
              orgIdFromSession = fallbackData.orgId
              console.log('[ReserveRedirectPage] Retrieved data via fallback:', {
                tenantIdFromSession,
                orgIdFromSession,
              })
            } else {
              if (tenantIdFromSession && orgIdFromSession) {
                console.warn(
                  '[ReserveRedirectPage] Fallback skipValidation failed but IDs extracted from liffRedirectUri. Proceeding.'
                )
              } else {
                setErrorMessage(
                  'セッション情報の検証に失敗しました。セキュリティのため、最初からやり直してください。'
                )
                setIsLoading(false)
                return
              }
            }
          } catch (fallbackError) {
            console.error('[ReserveRedirectPage] Fallback also failed:', fallbackError)
            setErrorMessage('セッション情報の取得に失敗しました。最初からやり直してください。')
            setIsLoading(false)
            return
          }
        }
      } else {
        // state IDが取得できない場合、クッキーから直接取得
        console.log(
          '[ReserveRedirectPage] No state ID found, trying to get data from cookie directly'
        )
        try {
          const directResponse = await fetch(`/api/auth/line-state?skipValidation=true`, {
            method: 'GET',
            credentials: 'include',
          })

          if (!directResponse.ok) {
            throw new Error('Failed to get state data from cookie')
          }

          const directData = await directResponse.json()
          tenantIdFromSession = directData.tenantId
          orgIdFromSession = directData.orgId
          console.log('[ReserveRedirectPage] Retrieved data directly from cookie:', {
            tenantIdFromSession,
            orgIdFromSession,
          })
        } catch (e) {
          console.error('[ReserveRedirectPage] Failed to get data from cookie:', e)
          setErrorMessage('セッション情報が見つかりません。最初からやり直してください。')
          setIsLoading(false)
          return
        }
      }

      if (!tenantIdFromSession || !orgIdFromSession) {
        console.error(
          '[ReserveRedirectPage] tenantId or orgId is missing from initial session. Cannot proceed.'
        )
        setErrorMessage('サロン情報が見つかりません。予約フローを最初からやり直してください')
        setIsLoading(false)
        return
      }

      console.log(
        `[ReserveRedirectPage] Retrieved tenantId and orgId from session: ${tenantIdFromSession} ${orgIdFromSession}`
      )
      const computedRedirectUrl = `/${locale}/reservation/${orgIdFromSession}/calendar`
      setRedirectUrl(computedRedirectUrl)

      if (liff && liff.isLoggedIn()) {
        console.log('[ReserveRedirectPage] LIFF is logged in.')
        let idToken: string | null = null

        try {
          idToken = liff.getIDToken()
        } catch (e) {
          console.error('[ReserveRedirectPage] Error getting ID token:', e)
          setErrorMessage('LINE認証情報の取得に失敗しました')
          setIsLoading(false)
          return
        }

        if (!idToken) {
          console.error(
            '[ReserveRedirectPage] Could not get ID Token from LIFF even though logged in.'
          )
          setErrorMessage('LINE情報の取得に失敗しました。ログインし直してください')
          if (liff) liff.logout()
          setIsLoading(false)
          toast.error('認証に失敗しました。ログインし直してください')
          router.push(`/${locale}/reservation/${orgIdFromSession}`)
          return
        }

        console.log('[ReserveRedirectPage] Got idToken. Calling /api/line/verify-token...')
        try {
          const response = await fetch('/api/line/verify-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              idToken,
              tenantId: tenantIdFromSession,
              orgId: orgIdFromSession,
            }),
          })

          const data = await response.json()

          if (response.ok && data.success) {
            console.log('[ReserveRedirectPage] API call successful. Server issued session cookie.')
            console.log('[ReserveRedirectPage] Redirecting to:', computedRedirectUrl)
            // stateは使い捨てなので、削除処理は不要（サーバー側で削除済み）
            toast.success('認証に成功しました。予約ページへ移動します')
            router.push(computedRedirectUrl)
          } else {
            console.error('[ReserveRedirectPage] API call failed:', data)
            setErrorMessage(
              `認証サーバーとの通信に失敗しました: ${data.message || data.error || '詳細不明'}`
            )
            setIsLoading(false)
          }
        } catch (error) {
          console.error('[ReserveRedirectPage] Error calling /api/line/verify-token:', error)
          showErrorToast(error)
          setIsLoading(false)
        }
      } else if (liff && !liffIsLoading) {
        console.log('[ReserveRedirectPage] LIFF is not logged in. Initiating LIFF login.')
        if (!tenantIdFromSession || !orgIdFromSession) {
          console.error(
            '[ReserveRedirectPage] tenantId or orgId was not in session before trying to log in with LIFF.'
          )
          setErrorMessage('予約セッション情報が不足しています。最初からやり直してください')
          setIsLoading(false)
          return
        }
        console.log(
          `[ReserveRedirectPage] About to call liff.login(). Redirect URI should be this page or similar to continue the flow.`
        )

        try {
          liff.login({
            redirectUri: window.location.href,
          })
        } catch (e) {
          console.error('[ReserveRedirectPage] LIFF login failed:', e)
          setErrorMessage(
            `LINE連携ログインに失敗しました: ${e instanceof Error ? e.message : '不明なエラー'}`
          )
          setIsLoading(false)
        }
      } else {
        console.log(
          '[ReserveRedirectPage] LIFF object not available or still loading, cannot proceed with login check.'
        )
      }
    }

    handleLiffLogin()
  }, [
    liff,
    liffIsLoggedIn,
    liffProfile,
    liffIsLoading,
    liffIsError,
    liffErrorMessage,
    router,
    showErrorToast,
    locale,
  ])

  // 8秒以上ロードが続いた場合に強制ログアウトし予約トップへリダイレクトする処理
  useEffect(() => {
    // isLoading が true の時のみタイマーをセット
    if (isLoading) {
      timeoutRef.current = setTimeout(async () => {
        console.warn('[ReserveRedirectPage] Loading timeout exceeded 8 seconds. Logging out...')

        // 1. サーバー側のセッション Cookie を削除
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include',
          })
        } catch (e) {
          console.error('[ReserveRedirectPage] Failed to call logout API:', e)
        }

        // 2. LIFF 側のセッションも削除（エラーは握り潰す）
        try {
          if (liff && liff.isLoggedIn()) {
            liff.logout()
          }
        } catch (e) {
          console.error('[ReserveRedirectPage] Failed to logout from LIFF:', e)
        }

        // 3. ユーザーへトースト通知
        toast.error('タイムアウトしました。再度ログインしてください')
        await new Promise((resolve) => setTimeout(resolve, 3000))
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
        })
        router.push(`/${locale}/reservation`)
      }, 8000) // 8000ms = 8秒
    }

    // クリーンアップ: isLoading が false もしくはアンマウント時にタイマーを解除
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
              <Loader2 className="h-12 w-12 text-accent animate-spin" />
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
