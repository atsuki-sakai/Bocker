'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Gender, GENDER_VALUES } from '@/convex/types'
import { DatePicker } from '@/components/common'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { OptimizedCustomerRepository } from '@/services/supabase/repositories/customer/CustomerRepository.optimized'
import type { RowType } from '@/services/supabase/SupabaseService'

// フォームのバリデーションスキーマ
const profileFormSchema = z.object({
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  email: z.string().email('有効なメールアドレスを入力してください').optional().or(z.literal('')),
  phone: z
    .string()
    .regex(/^$|^0\d{9,10}$/, '有効な電話番号を入力してください')
    .optional(),
  birthday: z.string().optional(),
  gender: z.enum(GENDER_VALUES).optional(),
  notes: z.string().max(500).optional(),
})

type ProfileFormData = z.infer<typeof profileFormSchema>

interface ProfileEditPageClientProps {
  orgId: string
  customerUid: string
  tenantId: string
  sessionOrgId: string
  initialData: {
    customer: RowType<'customer'>
    customerDetail: RowType<'customer_detail'> | null
  }
}

export function ProfileEditPageClient({ 
  orgId, 
  customerUid, 
  tenantId, 
  sessionOrgId, 
  initialData 
}: ProfileEditPageClientProps) {
  const router = useRouter()
  const { showErrorToast } = useErrorHandler()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
  })

  // 初期データの設定
  useEffect(() => {
    const { customer, customerDetail } = initialData

    setValue('firstName', customer.first_name || '')
    setValue('lastName', customer.last_name || '')
    setValue('email', customer.email || customerDetail?.email || '')
    setValue('phone', customer.phone || '')
    setValue('birthday', customerDetail?.birthday || '')
    const gender = customerDetail?.gender ?? 'unselected'
    setValue('gender', gender as Gender)
    setValue('notes', customerDetail?.notes || '')
  }, [initialData, setValue])

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true)

    try {
      const customerRepo = new OptimizedCustomerRepository()

      // 顧客情報の更新
      await customerRepo.updateCustomerWithDetailsAndPoints(
        customerUid,
        tenantId,
        sessionOrgId,
        {
          first_name: data.firstName || null,
          last_name: data.lastName || null,
          email: data.email || null,
          phone: data.phone || null,
        },
        {
          email: data.email || null,
          birthday: data.birthday || null,
          gender: data.gender || null,
          notes: data.notes || null,
        },
        0, // ポイントは変更しない
        [] // タグは変更しない
      )

      toast.success('プロフィールを更新しました')
      router.push(`/customer/${orgId}/${customerUid}/profile`)
    } catch (error) {
      showErrorToast(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center space-x-4">
        <Link href={`/customer/${orgId}/${customerUid}/profile`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h2 className="text-2xl font-bold text-primary">プロフィール編集</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 姓 */}
              <div className="space-y-2">
                <Label htmlFor="lastName">姓</Label>
                <Input id="lastName" {...register('lastName')} placeholder="山田" />
                {errors.lastName && (
                  <p className="text-sm text-destructive">{errors.lastName.message}</p>
                )}
              </div>

              {/* 名 */}
              <div className="space-y-2">
                <Label htmlFor="firstName">名</Label>
                <Input id="firstName" {...register('firstName')} placeholder="太郎" />
                {errors.firstName && (
                  <p className="text-sm text-destructive">{errors.firstName.message}</p>
                )}
              </div>

              {/* メールアドレス */}
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="example@email.com"
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>

              {/* 電話番号 */}
              <div className="space-y-2">
                <Label htmlFor="phone">電話番号</Label>
                <Input id="phone" type="tel" {...register('phone')} placeholder="09012345678" />
                {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
              </div>

              {/* 生年月日 */}
              <div className="space-y-2">
                <Label htmlFor="birthday">生年月日</Label>
                <DatePicker
                  value={watch('birthday') ? new Date(watch('birthday')!) : undefined}
                  onChange={(date) => setValue('birthday', date?.toISOString().split('T')[0] || '')}
                  placeholder="生年月日を選択してください"
                  toDate={new Date()} // 未来の日付は選択不可
                />
                {errors.birthday && (
                  <p className="text-sm text-destructive">{errors.birthday.message}</p>
                )}
              </div>

              {/* 性別 */}
              <div className="space-y-2">
                <Label htmlFor="gender">性別</Label>
                <Select
                  value={watch('gender') || 'unselected'}
                  onValueChange={(value) => setValue('gender', value as Gender)}
                >
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unselected">未設定</SelectItem>
                    <SelectItem value="male">男性</SelectItem>
                    <SelectItem value="female">女性</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && (
                  <p className="text-sm text-destructive">{errors.gender.message}</p>
                )}
              </div>
            </div>

            {/* 備考 */}
            <div className="space-y-2">
              <Label htmlFor="notes">備考</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="アレルギーや特記事項などがあればご記入ください"
                rows={4}
              />
              {errors.notes && <p className="text-sm text-destructive">{errors.notes.message}</p>}
            </div>

            {/* ボタン */}
            <div className="flex justify-end space-x-2 pt-4">
              <Link href={`/customer/${orgId}/${customerUid}/profile`}>
                <Button type="button" variant="outline">
                  キャンセル
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="animate-spin mr-2">●</span>
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    保存
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}