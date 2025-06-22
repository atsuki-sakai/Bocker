'use client'

import { useState, useEffect, useMemo } from 'react'
import { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useParams, useRouter } from 'next/navigation'
import { useLiff } from '@/hooks/useLiff'
import { ChevronRight, Loader2, Eye, EyeOff } from 'lucide-react'
import { motion } from 'framer-motion'
import { z } from 'zod'
import { api } from '@/convex/_generated/api'
import { fetchQuery } from 'convex/nextjs'
import { useQuery } from 'convex/react'
import { useZodForm } from '@/hooks/useZodForm'
import { Mail, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Loading } from '@/components/common'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { OptimizedCustomerRepository } from '@/services/supabase/repositories/customer/CustomerRepository.optimized'
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

export default function ReservePage() {
  const params = useParams()
  const { liff } = useLiff()
  const router = useRouter()
  const { showErrorToast } = useErrorHandler()
  const orgId = params.id as Id<'organization'>
  const customerRepository = useMemo(() => new OptimizedCustomerRepository(), [])
  const [tenantId, setTenantId] = useState<Id<'tenant'> | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isFirstLogin, setIsFirstLogin] = useState(false)
  const organization = useQuery(
    api.organization.config.query.findByTenantAndOrg,
    tenantId
      ? {
          tenant_id: tenantId,
          org_id: orgId,
        }
      : 'skip'
  )

  const handleLineLogin = async () => {
    console.log('[handleLineLogin] Starting LINE login')
    console.log('[handleLineLogin] liff object:', liff)
    console.log('[handleLineLogin] liff.isInClient():', liff?.isInClient())
    console.log('[handleLineLogin] Current URL:', window.location.href)
    console.log('[handleLineLogin] tenantId:', tenantId)
    console.log('[handleLineLogin] orgId:', orgId)

    if (!liff?.isInClient()) {
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
          }),
        })

        if (!response.ok) {
          const errorData = await response.text()
          console.error('[handleLineLogin] Failed to create LINE state:', errorData)
          throw new Error('Failed to create LINE state')
        }

        const { stateId } = await response.json()
        console.log('[handleLineLogin] Received stateId:', stateId)

        // LIFFの仕様上、redirectUri は登録済みのベースパス（例: /reservation）である必要がある。
        // orgId や calendar などの深いパスは liffRedirectUri にエンコードされるため、
        // ここではベースパスに留めておき、戻り先は ReserveRedirectPage で復元する。

        const locale = window.location.pathname.split('/')[1] || 'ja'
        const callbackUrl = new URL(`/${locale}/reservation`, window.location.origin)

        // state と テナント / 組織ID をクエリとして埋め込み
        // ・state      : CSRF / 一時情報用
        // ・tid (tenantId)
        // ・oid (orgId)
        // ReserveRedirectPage 側で liffRedirectUri をパースして取得する

        callbackUrl.searchParams.set('state', stateId)
        if (tenantId) callbackUrl.searchParams.set('tid', tenantId)
        callbackUrl.searchParams.set('oid', orgId)

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
      // 古いセッションは自動的に管理されるため、明示的な削除は不要

      if (!tenantId) {
        throw new Error('テナントIDが見つかりません')
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
        router.push(`/reservation/${orgId}/calendar`)
      } else {
        // 新規登録の場合、新しいAPIルートを呼び出す
        const registrationResponse = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orgName: organization?.org.org_name || '',
            email: data.email,
            password: data.password, // 生パスワードを送信
            tenantId: tenantId,
            orgId: orgId,
            detailData: {
              // APIの期待する形式に合わせる
              email: data.email || '',
              gender: 'unselected', // 必要に応じてフォームから取得またはデフォルト値を設定
              birthday: null,
              age: null,
              notes: '',
            },
            initialPoints: 0,
          }),
        })

        const registrationResult = await registrationResponse.json()

        if (!registrationResponse.ok) {
          toast.error(registrationResult.error || 'アカウント作成に失敗しました')
          return
        }
        // アカウント作成成功後、そのままログイン処理（セッション作成）
        const sessionResponse = await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: data.email,
            password: data.password, // ログインAPIには生パスワード
            tenantId: tenantId,
            orgId: orgId,
          }),
        })

        const sessionResult = await sessionResponse.json()

        if (!sessionResponse.ok) {
          toast.error(sessionResult.error || 'アカウント作成後のログインに失敗しました')
          return
        }

        toast.success('アカウントを作成し、ログインしました')
        router.push(`/reservation/${orgId}/calendar`)
      }
    } catch (error) {
      showErrorToast(error)
    }
  }

  useEffect(() => {
    // サーバーAPI経由でセッション有無を判定
    fetch('/api/auth/session', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) {
          console.log('[useEffect] Session check failed:', res)
          // セッションが見つからない場合は正常な動作なので、エラーとして扱わない
          return null
        }
        console.log('[useEffect] Session check successful:', res)
        return res.json()
      })
      .then((data) => {
        console.log('[useEffect] Session check data:', data)
        if (data && data.session) {
          router.push(`/reservation/${orgId}/calendar`)
        }
      })
      .catch((error) => {
        // ネットワークエラーなど、本当のエラーのみログ出力
        console.error('Session check failed:', error)
      })

    // 組織情報を取得して、テナントIDを設定
    fetchQuery(api.organization.query.findByOrgId, {
      org_id: orgId,
    }).then((res) => {
      if (res) {
        setTenantId(res.tenant_id)
      }
    })
  }, [router, orgId, tenantId])

  if (!organization || !tenantId) {
    return <Loading />
  }

  return (
    <div className="w-full  mx-auto bg-background min-h-screen flex items-center justify-center">
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
                    <span>ログイン / アカウント作成</span>
                    <ChevronRight className="h-5 w-5" />
                  </div>
                )}
              </Button>
            </form>
            <p className="text-xs text-center text-muted-foreground px-4 mt-4">
              初めての方はアカウントが作成されます。
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
              <Button className="px-8 py-5 w-full" onClick={handleLineLogin}>
                <div className="flex items-center justify-center space-x-2">
                  <span className="font-bold text-base">LINEでログイン</span>
                  <ChevronRight className="h-5 w-5" />
                </div>
              </Button>
            </div>
          </CardFooter>
          <p className="text-xs text-center text-muted-foreground mb-4 px-8">
            ログインすることで、当サービスの
            <Link
              href={`/reservation/${orgId}/calendar/terms-of-use`}
              className="underline text-link-foreground cursor-pointer mx-1"
            >
              利用規約
            </Link>
            および
            <Link
              href={`/reservation/${orgId}/calendar/privacy-policy`}
              className="underline text-link-foreground cursor-pointer mx-1"
            >
              プライバシーポリシー
            </Link>
            に同意したものとします。
          </p>
        </Card>
      </motion.div>
    </div>
  )
}
