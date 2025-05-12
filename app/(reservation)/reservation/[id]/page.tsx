'use client'

import { useState, useEffect } from 'react'
import { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useParams, useRouter } from 'next/navigation'
import { setCookie } from '@/lib/utils'
import { useLiff } from '@/hooks/useLiff'
import { ChevronRight, Loader2, Eye, EyeOff } from 'lucide-react'
import { motion } from 'framer-motion'
import { LINE_LOGIN_SESSION_KEY } from '@/services/line/constants'
import { z } from 'zod'
import { api } from '@/convex/_generated/api'
import { useMutation } from 'convex/react'
import { useZodForm } from '@/hooks/useZodForm'
import { fetchQuery } from 'convex/nextjs'
import { Mail, Lock } from 'lucide-react'
import { ZodTextField } from '@/components/common'
import { encryptStringCryptoJS, deleteCookie } from '@/lib/utils'
import { toast } from 'sonner'
import { handleErrorToMsg } from '@/lib/error'

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
  const salonId = params.id as Id<'salon'>

  const [showPassword, setShowPassword] = useState(false)
  const [isFirstLogin, setIsFirstLogin] = useState(false)

  const createCompleteFields = useMutation(api.customer.core.mutation.createCompleteFields)

  const handleLineLogin = () => {
    console.log('liff', liff)
    if (!liff?.isInClient()) {
      console.log('liff?.isInClient()', liff?.isInClient())
      const session = JSON.stringify({
        salonId,
      })
      setCookie(LINE_LOGIN_SESSION_KEY, session, 60)
      liff?.login()
    }
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useZodForm(emailLoginSchema)

  const onSubmit = async (data: z.infer<typeof emailLoginSchema>) => {
    setIsFirstLogin(true)

    try {
      deleteCookie(LINE_LOGIN_SESSION_KEY) // 古いクッキーは削除

      // 既存ユーザーの確認
      const existingCustomer = await fetchQuery(api.customer.core.query.findByEmail, {
        email: data.email,
        salonId,
      })
      console.log('existingCustomer', existingCustomer)

      if (existingCustomer) {
        // 既存ユーザーの場合は認証APIを使用
        const response = await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: data.email,
            password: data.password,
            salonId: salonId,
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          toast.error(result.error || 'ログインに失敗しました')
          return
        }

        toast.success('ログインに成功しました')
        router.push(`/reservation/${salonId}/calendar`)
      } else {
        // 新規登録の場合
        const encryptedPassword = encryptStringCryptoJS(
          data.password,
          process.env.NEXT_PUBLIC_ENCRYPTION_SECRET_KEY!
        )

        // 1. まずユーザーを作成
        const customerId = await createCompleteFields({
          salonId: salonId,
          email: data.email,
          password: encryptedPassword,
          tags: ['EMAIL'],
        })

        // 2. 作成したユーザーIDでセッションを作成
        const response = await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: data.email,
            password: data.password,
            salonId: salonId,
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          toast.error(result.error || 'アカウント作成後のログインに失敗しました')
          return
        }

        toast.success('アカウントを作成しました')
        router.push(`/reservation/${salonId}/calendar`)
      }
    } catch (error) {
      toast.error(handleErrorToMsg(error))
    }
  }

  useEffect(() => {
    // サーバーAPI経由でセッション有無を判定
    fetch('/api/line/session', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.session) {
          router.push(`/reservation/${salonId}/calendar`)
        }
      })
  }, [router, salonId])

  return (
    <div className="w-full  mx-auto bg-background min-h-screen flex items-center justify-center">
      <motion.div
        className="flex items-center justify-center px-4 pb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full max-w-md shadow-lg border-none mt-4">
          <CardHeader className="py-5">
            <div className="flex flex-col items-start">
              <h1 className="text-2xl font-bold text-primary bg-clip-text">Bocker</h1>
              <span className="text-xs scale-75 -ml-3 -mt-1.5 text-muted-foreground">
                予約を簡単・便利に
              </span>
            </div>
          </CardHeader>

          <CardContent className="">
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
            {isFirstLogin && (
              <p className="text-xs text-center text-muted-foreground mb-4 px-4 mt-4">
                パスワードを忘れましたか？
                <span className="underline text-link-foreground cursor-pointer mx-1">こちら</span>
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
          <p className="text-xs text-center text-muted-foreground mb-4 px-4">
            ログインすることで、当サービスの
            <span className="underline text-link-foreground cursor-pointer mx-1">利用規約</span>
            および
            <span className="underline text-link-foreground cursor-pointer mx-1">
              プライバシーポリシー
            </span>
            に同意したものとします。
          </p>
        </Card>
      </motion.div>
    </div>
  )
}
