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

// メールアドレス入力バリデーション
const requestResetSchema = z.object({
  email: z.string().email({ message: '有効なメールアドレスを入力してください' }).max(255),
})

function RequestResetContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

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
        <p className="text-sm text-red-500">無効なリセットページです。</p>
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
        toast.success(result.message || 'パスワードリセットメールを送信しました')
        // 送信完了後は予約ログイン画面へ戻す
        router.back()
      } else {
        toast.error(result.error || 'メール送信に失敗しました')
      }
    } catch (error) {
      console.error('reset-password request error', error)
      toast.error('内部エラーが発生しました')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">パスワードリセット申請</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  className="pl-10"
                  placeholder="example@example.com"
                />
              </div>
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> 送信中...
                </span>
              ) : (
                'リセットメールを送信'
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground text-center w-full">
            入力したメールアドレス宛にリセット用リンクを送信します。
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
