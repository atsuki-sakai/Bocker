'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Link } from '@/i18n/navigation'
import { useLiff } from '@/hooks/useLiff'
import { ChevronRight, Loader2, Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { motion } from 'framer-motion'
import { z } from 'zod'
import { api } from '@/convex/_generated/api'
import { fetchQuery } from 'convex/nextjs'
import { useQuery } from 'convex/react'
import { useZodForm } from '@/hooks/useZodForm'
import { toast } from 'sonner'
import { Loading } from '@/components/common'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import Image from 'next/image'
import { CustomerRepository } from '@/services/supabase/repositories/customer/CustomerRepository'
import { ZodTextField } from '@/components/common'

const emailLoginSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'メールアドレスを入力してください' })
    .max(255, { message: 'メールアドレスは255文字以内で入力してください' })
    .email({ message: 'メールアドレスが不正です' }),
  password: z
    .string()
    .min(1, { message: 'パスワードを入力してください' })
    .max(32, { message: 'パスワードは32文字以内で入力してください' }),
})

interface CustomerLoginPageProps {
  params: Promise<{
    org_id: string
  }>
}

export default function CustomerLoginPage({ params }: CustomerLoginPageProps) {
  const router = useRouter()
  const locale = useLocale()
  const { liff, isLoggedIn: liffIsLoggedIn, isLoading: liffIsLoading } = useLiff()
  const { showErrorToast } = useErrorHandler()
  const [orgId, setOrgId] = useState<Id<'organization'> | null>(null)
  const [tenantId, setTenantId] = useState<Id<'tenant'> | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isFirstLogin, setIsFirstLogin] = useState(false)
  const [isProcessingLineCallback, setIsProcessingLineCallback] = useState(false)
  const [lineCallbackError, setLineCallbackError] = useState<string | null>(null)
  const customerRepository = useMemo(() => new CustomerRepository(), [])

  // Handle async params
  useEffect(() => {
    params.then(({ org_id }) => {
      setOrgId(org_id as Id<'organization'>)
    })
  }, [params])

  // Handle LINE callback
  useEffect(() => {
    async function handleLineCallback() {
      if (liffIsLoading || !liff || !orgId || !tenantId) {
        return
      }

      const urlParams = new URLSearchParams(window.location.search)
      const liffRedirectUri = urlParams.get('liffRedirectUri')
      const hasLineCallback = liffRedirectUri || urlParams.get('state')

      if (!hasLineCallback || isProcessingLineCallback) {
        return
      }

      setIsProcessingLineCallback(true)
      setLineCallbackError(null)

      // Extract state ID from URL parameters
      let stateId: string | null = null
      let extractedTenantId: string | null = null
      let extractedOrgId: string | null = null

      if (liffRedirectUri) {
        try {
          const decodedUri = decodeURIComponent(liffRedirectUri)
          const redirectUrl = new URL(decodedUri)
          const liffState = redirectUrl.searchParams.get('liff.state')

          if (liffState) {
            const innerSearchParams = new URLSearchParams(liffState.split('?')[1])
            stateId = innerSearchParams.get('state')
            extractedTenantId = innerSearchParams.get('tid')
            extractedOrgId = innerSearchParams.get('oid')
          }
        } catch (e) {
          console.error('[CustomerLogin] Failed to parse liffRedirectUri:', e)
        }
      }

      // Fallback to direct state parameter
      if (!stateId) {
        stateId = urlParams.get('state')
      }

      // Validate state
      if (stateId) {
        try {
          const stateResponse = await fetch(`/api/auth/line-state?stateId=${stateId}`, {
            method: 'GET',
            credentials: 'include',
          })

          if (!stateResponse.ok) {
            throw new Error('State validation failed')
          }

          const stateData = await stateResponse.json()
          if (!stateData.isCustomerLogin) {
            setLineCallbackError('不正なログインフローです')
            setIsProcessingLineCallback(false)
            return
          }
        } catch (e) {
          console.error('[CustomerLogin] State validation failed:', e)
          setLineCallbackError('認証情報の検証に失敗しました')
          setIsProcessingLineCallback(false)
          return
        }
      }

      // Get LINE ID token
      if (liff.isLoggedIn()) {
        let idToken: string | null = null
        try {
          idToken = liff.getIDToken()
        } catch (e) {
          console.error('[CustomerLogin] Error getting ID token:', e)
          setLineCallbackError('LINE認証情報の取得に失敗しました')
          setIsProcessingLineCallback(false)
          return
        }

        if (!idToken) {
          setLineCallbackError('LINE認証情報の取得に失敗しました')
          setIsProcessingLineCallback(false)
          return
        }

        // Verify token and create session
        try {
          const response = await fetch('/api/line/verify-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              idToken,
              tenantId: tenantId || extractedTenantId,
              orgId: orgId || extractedOrgId,
              isCustomerLogin: true,
            }),
          })

          const data = await response.json()

          if (response.ok && data.success) {
            toast.success('LINEログインに成功しました')

            // Get customer UID from session
            const sessionResponse = await fetch('/api/auth/session', {
              method: 'GET',
              credentials: 'include',
            })

            if (sessionResponse.ok) {
              const sessionData = await sessionResponse.json()
              if (sessionData.session && sessionData.session.customerUid) {
                router.push(
                  `/${locale}/customer/${orgId}/${sessionData.session.customerUid}/profile`
                )
              }
            }
          } else {
            setLineCallbackError(data.message || 'LINE認証に失敗しました')
            setIsProcessingLineCallback(false)
          }
        } catch (error) {
          console.error('[CustomerLogin] Error verifying token:', error)
          setLineCallbackError('認証処理中にエラーが発生しました')
          setIsProcessingLineCallback(false)
        }
      } else if (!liffIsLoading) {
        // Not logged in to LINE, initiate login
        try {
          liff.login({
            redirectUri: window.location.href,
          })
        } catch (e) {
          console.error('[CustomerLogin] LIFF login failed:', e)
          setLineCallbackError('LINEログインに失敗しました')
          setIsProcessingLineCallback(false)
        }
      }
    }

    handleLineCallback()
  }, [
    liff,
    liffIsLoggedIn,
    liffIsLoading,
    router,
    locale,
    orgId,
    tenantId,
    isProcessingLineCallback,
  ])

  const organization = useQuery(
    api.organization.config.query.findByTenantAndOrg,
    tenantId && orgId
      ? {
          tenant_id: tenantId,
          org_id: orgId,
        }
      : 'skip'
  )

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useZodForm(emailLoginSchema)

  // 現在のメール入力値を監視
  const watchedEmail = watch('email')

  const handleLineLogin = async () => {
    // LIFFが読み込み中の場合は待機
    if (liffIsLoading) {
      console.log('[handleLineLogin] LIFF is still loading, please wait...')
      toast.info('LINEログイン機能を読み込み中です。もう一度お試しください。')
      return
    }

    // LIFFオブジェクトが利用できない場合のチェック
    if (!liff) {
      console.error('[handleLineLogin] LIFF is not available')
      toast.error('LINEログイン機能が利用できません。ページを再読み込みしてください。')
      return
    }

    if (!liff.isInClient()) {
      try {
        // セキュアなstateをサーバーで生成
        console.log('[handleLineLogin] Creating LINE state with:', { tenantId, orgId })
        const response = await fetch('/api/auth/line-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            tenantId,
            orgId,
            isCustomerLogin: true, // 顧客ログインフラグを追加
          }),
        })

        if (!response.ok) {
          const errorData = await response.text()
          console.error('[handleLineLogin] Failed to create LINE state:', errorData)
          throw new Error('Failed to create LINE state')
        }

        const { stateId } = await response.json()
        console.log('[handleLineLogin] Received stateId:', stateId)

        // LIFFエンドポイントが /reservation なので、共通認証コールバックページを使用
        const callbackUrl = new URL(
          `/${locale}/reservation/auth/callback`,
          window.location.origin
        )
        
        // 認証後のリダイレクトタイプを指定
        callbackUrl.searchParams.set('redirect_type', 'customer')
        callbackUrl.searchParams.set('state', stateId)
        if (tenantId) callbackUrl.searchParams.set('tid', tenantId)
        if (orgId) callbackUrl.searchParams.set('oid', orgId)

        console.log('[handleLineLogin] callbackUrl:', callbackUrl)
        console.log(
          '[handleLineLogin] Redirecting to LINE with callback URL:',
          callbackUrl.toString()
        )

        liff?.login({
          redirectUri: callbackUrl.toString(),
        })
      } catch (error) {
        console.error('[handleLineLogin] Failed to initiate LINE login:', error)
        toast.error('LINEログインの準備に失敗しました')
      }
    } else {
      console.log('[handleLineLogin] Already in LINE client, skipping login')
    }
  }

  const onSubmit = async (data: z.infer<typeof emailLoginSchema>) => {
    setIsFirstLogin(true)
    console.log('DATA', data)

    try {
      if (!tenantId) {
        throw new Error('テナントIDが見つかりません')
      }
      if (!orgId) {
        throw new Error('組織IDが見つかりません')
      }

      // 既存ユーザーの確認
      const existingCustomer = await customerRepository.findByTenantAndOrgAndCustomerEmail(
        tenantId,
        orgId,
        data.email
      )

      if (existingCustomer) {
        // 既存ユーザーの場合は認証APIを使用
        const response = await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: existingCustomer.email,
            password: data.password,
            tenantId: tenantId,
            orgId: orgId,
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          toast.error(result.error || 'ログインに失敗しました')
          return
        }

        toast.success('ログインに成功しました')
        // ログイン済みユーザーを顧客プロフィールページにリダイレクト
        router.push(`/${locale}/customer/${orgId}/${existingCustomer.uid}/profile`)
      } else {
        // 新規ユーザーの場合はエラーを表示
        toast.error('アカウントが見つかりません。予約ページから新規登録してください。')
      }
    } catch (error) {
      showErrorToast(error)
    }
  }

  // セッション確認とリダイレクト処理
  useEffect(() => {
    if (!orgId) return

    // Check if this is a LINE callback
    const urlParams = new URLSearchParams(window.location.search)
    const isLineCallback = urlParams.get('liffRedirectUri') || urlParams.get('state')

    // Skip session check if processing LINE callback
    if (!isLineCallback && !isProcessingLineCallback) {
      // サーバーAPI経由でセッション有無を判定
      fetch('/api/auth/session', { method: 'GET', credentials: 'include' })
        .then((res) => {
          if (!res.ok) {
            console.log('[useEffect] Session check failed:', res)
            return null
          }
          console.log('[useEffect] Session check successful:', res)
          return res.json()
        })
        .then((data) => {
          console.log('[useEffect] Session check data:', data)
          if (data && data.session && data.session.customerUid) {
            // ログイン済みの場合は顧客プロフィールページにリダイレクト
            router.push(`/${locale}/customer/${orgId}/${data.session.customerUid}/profile`)
          }
        })
        .catch((error) => {
          console.error('Session check failed:', error)
        })
    }

    // 組織情報を取得して、テナントIDを設定
    fetchQuery(api.organization.query.findByOrgId, {
      org_id: orgId,
    }).then((res) => {
      if (res) {
        setTenantId(res.tenant_id)
      }
    })
  }, [router, orgId, locale, isProcessingLineCallback])

  // Show loading state for initial data or LINE callback processing
  if (!organization || !tenantId || !orgId || isProcessingLineCallback) {
    return <Loading />
  }

  // Show error state for LINE callback errors
  if (lineCallbackError) {
    return (
      <div className="w-full mx-auto bg-background min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md shadow-lg border-destructive">
          <CardContent className="flex flex-col items-center justify-center space-y-4 py-6">
            <p className="text-center text-destructive font-semibold">エラーが発生しました</p>
            <p className="text-center text-sm text-muted-foreground max-w-xs">
              {lineCallbackError}
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setLineCallbackError(null)
                setIsProcessingLineCallback(false)
                // Clear URL parameters
                const newUrl = window.location.pathname
                window.history.replaceState({}, '', newUrl)
              }}
            >
              ログイン画面に戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full mx-auto bg-background min-h-screen flex items-center justify-center">
      <motion.div
        className="flex items-center justify-center px-4 pb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full max-w-md shadow-lg border-none mt-4 bg-background overflow-hidden">
          <CardHeader className="relative w-full h-[220px] mb-2 overflow-hidden">
            <div className="absolute inset-0">
              {organization.config?.images && organization.config.images.length > 0 ? (
                <div className="w-full h-full relative">
                  <Image
                    src={organization.config.images[0].original_url}
                    alt={organization.org.org_name ?? ''}
                    width={1280}
                    height={1280}
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-palette-1 to-palette-2 opacity-30"></div>
                  <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/50">
                    <h1 className="text-xl font-bold text-white">{organization.org.org_name}</h1>
                    <p className="text-sm text-white mt-1">{organization.config.address}</p>
                  </div>
                </div>
              ) : (
                <div className="flex-col w-full h-full bg-gradient-to-b from-palette-1 to-palette-2 text-white flex items-center justify-center">
                  <h1 className="text-2xl font-bold text-muted-foreground">
                    {organization.org.org_name}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-2">
                    {organization.config?.address}
                  </p>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="mt-4">
            <h2 className="text-lg font-semibold text-center mb-4">顧客ログイン</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <ZodTextField
                icon={<Mail className="w-5 h-5" />}
                register={register}
                name="email"
                label="メールアドレス"
                placeholder="メールアドレスを入力してください"
                errors={errors}
              />
              <div className="flex items-start gap-2">
                <div className="w-full">
                  <ZodTextField
                    icon={<Lock className="w-5 h-5" />}
                    type={showPassword ? 'text' : 'password'}
                    register={register}
                    name="password"
                    label="パスワード"
                    placeholder="パスワードを入力してください"
                    errors={errors}
                  />
                </div>
                <Button
                  className="mt-7"
                  variant="outline"
                  size="icon"
                  onClick={(e) => {
                    e.preventDefault()
                    setShowPassword(!showPassword)
                  }}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </Button>
              </div>

              <Button
                type="submit"
                className="w-full text-base font-bold mt-6"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>ログイン中...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-4">
                    <span>ログイン</span>
                    <ChevronRight className="h-5 w-5" />
                  </div>
                )}
              </Button>
            </form>
            <p className="text-xs text-center text-muted-foreground px-4 mt-4">
              初めての方は
              <Link
                href={`/${locale}/reservation/${orgId}`}
                className="underline text-link-foreground cursor-pointer mx-1"
              >
                こちら
              </Link>
              から予約を始めましょう！
            </p>
            {isFirstLogin && (
              <p className="text-xs text-center text-muted-foreground mb-4 px-4 mt-4">
                パスワードを忘れましたか？
                <Link
                  href={`/customer/reset-password${watchedEmail ? `?e=${encodeURIComponent(watchedEmail)}` : ''}`}
                  className="underline text-link-foreground cursor-pointer mx-1"
                  onClick={() => {
                    if (tenantId) {
                      sessionStorage.setItem('tenantId', tenantId as string)
                    }
                    sessionStorage.setItem('orgId', orgId as string)
                  }}
                >
                  こちら
                </Link>
                から再設定できます。
              </p>
            )}
          </CardContent>

          <Separator className="mb-5 w-1/3 mx-auto" />
          <CardFooter className="flex justify-center pb-6">
            <div className="w-full">
              <Button
                className="px-8 py-5 w-full"
                onClick={handleLineLogin}
                disabled={liffIsLoading || !orgId || !tenantId}
              >
                <div className="flex items-center justify-center space-x-2">
                  {liffIsLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="font-bold text-base">読み込み中...</span>
                    </>
                  ) : (
                    <>
                      <span className="font-bold text-base">LINEでログイン</span>
                      <ChevronRight className="h-5 w-5" />
                    </>
                  )}
                </div>
              </Button>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}