'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { z } from 'zod'
import { useZodForm } from '@/hooks/useZodForm'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

// メールアドレス入力バリデーション
const requestResetSchema = (t: ReturnType<typeof useTranslations>) =>
  z.object({
    email: z
      .string()
      .email({ message: t('emailInvalid') })
      .max(255),
  })

function RequestResetContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const t = useTranslations('auth.customerResetPassword')

  // sessionStorage から ID を取得（URL からは排除）
  const [ids, setIds] = useState<{ tenantId: string | null; orgId: string | null }>({
    tenantId: null,
    orgId: null,
  })

  // email クエリ (省略可)
  const emailFromQuery = searchParams.get('e') || ''

  // フォームフックは常に呼び出して Hooks の順序を安定させる
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useZodForm(requestResetSchema(t), {
    defaultValues: {
      email: emailFromQuery,
    },
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIds({
        tenantId: sessionStorage.getItem('tenantId'),
        orgId: sessionStorage.getItem('orgId'),
      })
    }
  }, [])

  // 必須チェック
  if (!ids.tenantId || !ids.orgId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-destructive">{t('notFound')}</p>
      </div>
    )
  }

  const onSubmit = async (data: z.infer<ReturnType<typeof requestResetSchema>>) => {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          tenantId: ids.tenantId,
          orgId: ids.orgId,
        }),
      })

      if (res.ok) {
        toast.success(t('message.resetPassword'))
        // 送信完了後は予約ログイン画面へ戻す
        router.back()
      } else {
        toast.error(t('message.resetPasswordFailed'))
      }
    } catch (error) {
      console.error('reset-password request error', error)
      toast.error(t('message.resetPasswordError'))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  className="pl-10"
                  placeholder="example@example.com"
                />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> {t('processing')}
                </span>
              ) : (
                t('submit')
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground text-center w-full">
            {t('emailSentSubtitle')}
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function RequestResetPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      }
    >
      <RequestResetContent />
    </Suspense>
  )
}
