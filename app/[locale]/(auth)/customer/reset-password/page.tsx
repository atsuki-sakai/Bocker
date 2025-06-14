'use client'

import { Suspense, useEffect, useState, useMemo } from 'react'
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
const createRequestResetSchema = (t: (key: string) => string) =>
  z.object({
    email: z
      .string()
      .email({ message: t('validation.emailInvalid') })
      .max(255),
  })

function RequestResetContent() {
  const t = useTranslations('auth.resetPassword')
  const searchParams = useSearchParams()
  const router = useRouter()

  // email クエリ (省略可)
  const emailFromQuery = searchParams.get('e') || ''

  // sessionStorage から ID を取得（URL からは排除）
  const [ids, setIds] = useState<{ tenantId: string | null; orgId: string | null }>({
    tenantId: null,
    orgId: null,
  })

  const requestResetSchema = useMemo(() => createRequestResetSchema(t), [t])

  // フォームフックは常に呼び出して Hooks の順序を安定させる
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useZodForm(requestResetSchema, {
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
        <p className="text-sm text-destructive">{t('messages.invalidResetPage')}</p>
      </div>
    )
  }

  const onSubmit = async (data: z.infer<typeof requestResetSchema>) => {
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

      const result = await res.json()

      if (res.ok) {
        toast.success(result.message || t('messages.emailSent'))
        // 送信完了後は予約ログイン画面へ戻す
        router.back()
      } else {
        toast.error(result.error || t('messages.emailSendFailed'))
      }
    } catch (error) {
      console.error('reset-password request error', error)
      toast.error(t('messages.internalError'))
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
                  placeholder={t('emailPlaceholder')}
                />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> {t('sending')}
                </span>
              ) : (
                t('submit')
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground text-center w-full">{t('description')}</p>
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
