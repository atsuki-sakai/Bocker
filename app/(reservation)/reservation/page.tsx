'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLiff } from '@/hooks/useLiff'
import { getCookie, deleteCookie } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { handleErrorToMsg } from '@/lib/error'
import { toast } from 'sonner'

import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, ExternalLink } from 'lucide-react'
import { LINE_LOGIN_SESSION_KEY } from '@/services/line/constants'

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
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    async function handleLiffLogin() {
      console.log('[ReserveRedirectPage] useEffect triggered. LIFF object:', liff)
      console.log('[ReserveRedirectPage] LIFF states:', {
        isLoggedIn: liffIsLoggedIn,
        isLoading: liffIsLoading,
        isError: liffIsError,
      })

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

      const initialSession = getCookie(LINE_LOGIN_SESSION_KEY)
      let salonIdFromSession: string | null = null

      if (initialSession) {
        try {
          const parsedSession = JSON.parse(initialSession)
          salonIdFromSession = parsedSession.salonId
        } catch (e) {
          console.error('[ReserveRedirectPage] Failed to parse initial session cookie:', e)
          setErrorMessage('セッション情報の解析に失敗しました')
          setIsLoading(false)
          return
        }
      }

      if (!salonIdFromSession) {
        console.error(
          '[ReserveRedirectPage] salonId is missing from initial session. Cannot proceed.'
        )
        setErrorMessage('サロン情報が見つかりません。予約フローを最初からやり直してください')
        setIsLoading(false)
        return
      }

      console.log(`[ReserveRedirectPage] Retrieved salonId from session: ${salonIdFromSession}`)
      const computedRedirectUrl = `/reservation/${salonIdFromSession}/calendar`
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
          deleteCookie(LINE_LOGIN_SESSION_KEY)
          setIsLoading(false)
          toast.error('認証に失敗しました。ログインし直してください')
          router.push(`/reservation/${salonIdFromSession}`)
          return
        }

        console.log('[ReserveRedirectPage] Got idToken. Calling /api/line/verify-token...')
        try {
          const response = await fetch('/api/line/verify-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken, salonId: salonIdFromSession }),
          })

          const data = await response.json()

          if (response.ok && data.success) {
            console.log('[ReserveRedirectPage] API call successful. Server issued session cookie.')
            deleteCookie(LINE_LOGIN_SESSION_KEY)
            console.log('[ReserveRedirectPage] Deleted old LINE_LOGIN_SESSION_KEY.')
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
          setErrorMessage(`認証処理中にエラーが発生しました: ${handleErrorToMsg(error)}`)
          setIsLoading(false)
        }
      } else if (liff && !liffIsLoading) {
        console.log('[ReserveRedirectPage] LIFF is not logged in. Initiating LIFF login.')
        if (!initialSession || !salonIdFromSession) {
          console.error(
            '[ReserveRedirectPage] salonId was not in session before trying to log in with LIFF.'
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
  }, [liff, liffIsLoggedIn, liffProfile, liffIsLoading, liffIsError, liffErrorMessage, router])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md shadow-lg border-none">
          <CardContent className="flex flex-col items-center justify-center space-y-6 py-6">
            <div className="relative">
              <Loader2 className="h-12 w-12 text-active animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-6 w-6 rounded-full bg-active-foreground animate-pulse"></div>
              </div>
            </div>
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
            <Button variant="outline" onClick={() => router.push('/reservation')}>
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
