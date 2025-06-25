'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Link } from '@/i18n/navigation'
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
import { OptimizedLineLoginButton } from '@/components/auth/OptimizedLineLoginButton'
import { useLineAuthHandler } from '@/hooks/useLineAuthHandler'

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
  const { showErrorToast } = useErrorHandler()
  const [orgId, setOrgId] = useState<Id<'organization'> | null>(null)
  const [tenantId, setTenantId] = useState<Id<'tenant'> | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isFirstLogin, setIsFirstLogin] = useState(false)
  const customerRepository = useMemo(() => new CustomerRepository(), [])

  const {
    handleLineAuth,
    isProcessing: isProcessingLineCallback,
    error: lineCallbackError,
  } = useLineAuthHandler({
    onSuccess: async () => {
      // セッションからcustomerUidを取得
      const sessionResponse = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
      })

      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json()
        if (sessionData.session && sessionData.session.customerUid) {
          router.push(`/${locale}/customer/${orgId}/${sessionData.session.customerUid}/profile`)
        }
      }
    },
  })

  // Handle async params
  useEffect(() => {
    params.then(({ org_id }) => {
      setOrgId(org_id as Id<'organization'>)
    })
  }, [params])

  // Handle LINE callback（最適化版）
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const hasLineCallback = urlParams.get('liffRedirectUri') || urlParams.get('state')

    if (hasLineCallback && orgId && tenantId && !isProcessingLineCallback) {
      handleLineAuth(tenantId, orgId, true)
    }
  }, [orgId, tenantId, handleLineAuth, isProcessingLineCallback])

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
              {lineCallbackError.message}
            </p>
            <Button
              variant="outline"
              onClick={() => {
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
    <div className="w-full mx-auto min-h-screen flex items-center justify-center">
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
                  <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-background text-center">
                    <h1 className="text-xl font-bold text-foreground">
                      {organization.org.org_name}
                    </h1>
                    <p className="text-sm text-foreground mt-1">{organization.config.address}</p>
                  </div>
                </div>
              ) : (
                <div className="flex-col w-full h-full bg-gradient-to-b from-palette-1 to-palette-2 text-foreground flex items-center justify-center">
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
                href={`/reservation/${orgId}`}
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
              <OptimizedLineLoginButton
                tenantId={tenantId}
                orgId={orgId}
                isCustomerLogin={true}
                onSuccess={async () => {
                  // セッションからcustomerUidを取得
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
                }}
              />
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}