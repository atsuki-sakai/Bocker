'use client'

import { useParams } from 'next/navigation'
import { z } from 'zod'
import { Gender } from '@/convex/types'
import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ZodTextField } from '@/components/common'
import { TagInput } from '@/components/common'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import { useEffect, useState, useMemo } from 'react'
import { useZodForm } from '@/hooks/useZodForm'
import { Button } from '@/components/ui/button'
import { GENDER_VALUES } from '@/convex/types'
import { MAX_NOTES_LENGTH, MAX_TEXT_LENGTH, MAX_TAG_LENGTH } from '@/convex/constants'
import { Loader2, Pencil } from 'lucide-react'
import { Loading } from '@/components/common'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { CustomerRepository } from '@/services/supabase/repositories/customer/CustomerRepository'
import type { RowType } from '@/services/supabase/SupabaseService'

// 'YYYY-MM-DD'形式の誕生日文字列から年齢を計算するヘルパー関数
const calculateAge = (birthdayString: string | undefined | null): number | undefined => {
  if (!birthdayString) {
    return undefined
  }
  const birthDate = new Date(birthdayString)
  // 日付が有効かチェック
  if (isNaN(birthDate.getTime())) {
    return undefined
  }

  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  // 今年の誕生日がまだ来ていない場合、年齢を調整
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  // 計算された年齢が負の場合（未来の日付が入力された場合など）、undefinedを返す
  if (age < 0) {
    return undefined
  }

  return age
}

const customerEditFormSchema = z.object({
  last_name: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return undefined
      return val
    },
    z
      .string()
      .min(1, { message: '苗字は必須です' })
      .max(MAX_TEXT_LENGTH, { message: `苗字は${MAX_TEXT_LENGTH}文字以内で入力してください` })
      .optional()
  ),
  first_name: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return undefined
      return val
    },
    z
      .string()
      .min(1, { message: '名前は必須です' })
      .max(MAX_TEXT_LENGTH, { message: `名前は${MAX_TEXT_LENGTH}文字以内で入力してください` })
      .optional()
  ),
  phone: z
    .string()
    .min(1, { message: '電話番号は必須です' })
    .max(MAX_TEXT_LENGTH, { message: `電話番号は${MAX_TEXT_LENGTH}文字以内で入力してください` })
    .optional(),
  email: z
    .string()
    .max(MAX_TEXT_LENGTH, {
      message: `メールアドレスは${MAX_TEXT_LENGTH}文字以内で入力してください`,
    })
    .refine((val) => !val || z.string().email().safeParse(val).success, {
      message: 'メールアドレスが不正です',
    })
    .optional(),
  gender: z.enum(GENDER_VALUES).default('unselected'),
  birthday: z.string().optional(),
  notes: z
    .string()
    .max(MAX_NOTES_LENGTH, { message: `メモは${MAX_NOTES_LENGTH}文字以内で入力してください` })
    .optional(),
  total_points: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return null
      const num = Number(val)
      return isNaN(num) || !isFinite(num) ? null : num
    },
    z
      .number()
      .min(0, { message: '保有ポイントは0以上で入力してください' })
      .max(99999999, { message: `保有ポイントは99999999以下で入力してください` })
      .nullable()
      .optional()
  ),
  tags: z
    .array(
      z
        .string()
        .max(MAX_TAG_LENGTH, { message: `タグは${MAX_TAG_LENGTH}文字以内で入力してください` })
    )
    .refine((tags) => tags.length <= 5, {
      message: `タグは最大で5つまで入力できます`,
    })
    .default([]),
})

// 完全な顧客データの型定義
type CompleteCustomerData = {
  customer: RowType<'customer'> | null
  customerDetail: RowType<'customer_detail'> | null
  customerPoints: RowType<'customer_points'> | null
}

export default function CustomerEditForm() {
  const params = useParams()
  const { tenantId, orgId, isLoaded } = useTenantAndOrganization()
  const router = useRouter()
  const customerUid = params.customer_id as string

  // 状態管理
  const [completeCustomer, setCompleteCustomer] = useState<CompleteCustomerData | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  // customerRepo の初期化を useMemo でラップ
  const customerRepo = useMemo(() => new CustomerRepository(), [])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
    setValue,
    watch,
  } = useZodForm(customerEditFormSchema)

  // 誕生日フィールドのregisterオブジェクトを取得
  const birthdayRegister = register('birthday')

  // 顧客データを取得
  useEffect(() => {
    const fetchCustomerData = async () => {
      if (!tenantId || !orgId || !customerUid || !isLoaded) {
        return
      }

      try {
        setIsLoadingData(true)
        const data = await customerRepo.getCompleteCustomerData(customerUid, tenantId, orgId)
        setCompleteCustomer(data)

        // フォームにデータを設定
        if (data.customer) {
          reset({
            last_name: data.customer.last_name || '',
            first_name: data.customer.first_name || '',
            phone: data.customer.phone || '',
            email: data.customer.email || '',
            birthday: data.customerDetail?.birthday || '',
            gender: (data.customerDetail?.gender as Gender) || 'unselected',
            notes: data.customerDetail?.notes || '',
            tags: data.customer.tags || [],
            total_points: data.customerPoints?.total_points || 0,
          })
        }
      } catch (error) {
        console.error('顧客データの取得に失敗しました:', error)
        toast.error('顧客データの取得に失敗しました')
      } finally {
        setIsLoadingData(false)
      }
    }

    fetchCustomerData()
  }, [tenantId, orgId, customerUid, isLoaded, reset, customerRepo]) // resetを依存配列に追加

  // フォーム送信処理
  const onSubmit = async (data: z.infer<typeof customerEditFormSchema>) => {
    console.log('フォームデータを送信中:', data)

    if (!completeCustomer || !completeCustomer.customer) {
      toast.error('顧客データの読み込みが完了していません。')
      return
    }

    if (!tenantId || !orgId) {
      toast.error('テナントIDまたは組織IDが見つかりません')
      return
    }

    try {
      // 年齢を計算
      const calculatedAge = calculateAge(data.birthday)

      // 顧客基本情報の更新データを準備
      const customerData = {
        email: data.email || '',
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        phone: data.phone || '',
        line_id: completeCustomer.customer.line_id || '',
        line_user_name: completeCustomer.customer.line_user_name || '',
      }

      // 顧客詳細情報の更新データを準備
      const detailData = {
        email: data.email || '',
        gender: data.gender || 'unselected',
        birthday: data.birthday || '',
        age: calculatedAge || null,
        notes: data.notes || '',
      }

      // RPCを使用して更新実行
      const result = await customerRepo.updateCustomerWithDetailsAndPoints(
        customerUid,
        tenantId,
        orgId,
        customerData,
        detailData,
        data.total_points || 0,
        data.tags || []
      )

      if (result.customer) {
        toast.success('顧客情報を更新しました')
        router.push(`/dashboard/customer/${customerUid}`)
      } else {
        toast.error('顧客情報の更新に失敗しました')
      }
    } catch (error) {
      console.error('更新処理でエラーが発生しました:', error)
      const errorMessage = error instanceof Error ? error.message : '顧客情報の更新に失敗しました'
      toast.error(errorMessage)
    }
  }

  // ローディング状態の表示
  if (!isLoaded || isLoadingData || !completeCustomer) {
    return <Loading />
  }

  // 表示用の年齢を計算
  const displayAge = calculateAge(watch('birthday'))

  return (
    <div className="container mx-auto py-4">
      <h2 className="text-2xl font-bold text-slate-700 mb-4">顧客情報編集</h2>
      {completeCustomer.customer?.line_user_name && (
        <p className="text-sm text-green-600 mb-4 p-2 border border-green-600 rounded-md w-fit">
          <span className="font-bold">LINEユーザー名 </span>{' '}
          <span className="text-slate-700 ml-2 tracking-wider font-bold">
            {completeCustomer.customer.line_user_name}
          </span>
        </p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="grid grid-cols-2 gap-6 col-span-1">
            <ZodTextField
              label="苗字"
              register={register}
              errors={errors}
              name="last_name"
              placeholder="苗字を入力してください"
            />
            <ZodTextField
              label="名前"
              register={register}
              errors={errors}
              name="first_name"
              placeholder="名前を入力してください"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ZodTextField
            label="電話番号"
            register={register}
            errors={errors}
            name="phone"
            placeholder="電話番号を入力してください"
          />
          <ZodTextField
            label="メールアドレス"
            register={register}
            errors={errors}
            name="email"
            placeholder="メールアドレスを入力してください"
            type="email"
          />
        </div>

        {/* 年齢と性別の表示 */}
        <div className="flex items-center gap-2">
          <p className="text-lg text-slate-700">
            {/* 年齢の表示 */}
            {displayAge !== undefined && displayAge !== null ? displayAge : '-'}
            <span className="text-base font-normal text-slate-700">歳</span>{' '}
            <span className="text-base font-normal text-slate-700">
              {watch('gender') === 'male'
                ? '男性'
                : watch('gender') === 'female'
                  ? '女性'
                  : '未選択'}
            </span>
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="flex flex-col gap-4">
            {/* ポイントフィールド */}
            <div>
              <ZodTextField
                label="保有ポイント"
                register={register}
                errors={errors}
                name="total_points"
                placeholder="保有ポイントを入力してください"
                type="number"
              />
              <span className="text-xs font-normal text-gray-500">
                保有ポイントの変更は慎重に行ってください。
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">性別</label>
              <Select
                onValueChange={(value) => {
                  setValue('gender', value as Gender, { shouldDirty: true })
                }}
                value={watch('gender') || 'unselected'}
              >
                <SelectTrigger className={errors.gender ? 'border-destructive' : ''}>
                  <SelectValue placeholder="性別を選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {GENDER_VALUES.map((genderValue) => (
                    <SelectItem key={genderValue} value={genderValue}>
                      {genderValue === 'unselected'
                        ? '未選択'
                        : genderValue === 'male'
                          ? '男性'
                          : '女性'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.gender && (
                <p className="text-sm font-medium text-destructive mt-1">{errors.gender.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">誕生日</label>
              <Input
                type="date"
                // registerのプロパティを展開
                {...birthdayRegister}
                // onChangeを上書きして、registerのonChangeも呼び出す
                onChange={(e) => {
                  // react-hook-formのonChangeを呼び出し
                  birthdayRegister.onChange(e)
                  // 追加のロジック（ログ出力など）
                  console.log('誕生日が変更されました:', e.target.value)
                }}
                className={errors.birthday ? 'border-destructive' : ''}
              />
              {errors.birthday && (
                <p className="text-sm font-medium text-destructive mt-1">
                  {errors.birthday.message}
                </p>
              )}
            </div>
          </div>
        </div>

        <div>
          <TagInput
            tags={watch('tags')}
            setTagsAction={(tags) => {
              setValue('tags', tags, { shouldDirty: true })
            }}
          />
          {errors.tags && (
            <p className="text-sm font-medium text-destructive mt-1">{errors.tags.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
          <Textarea
            {...register('notes')}
            rows={8}
            placeholder="メモを入力してください"
            disabled={isSubmitting}
            className={errors.notes ? 'border-destructive' : ''}
          />
          {errors.notes && (
            <p className="text-sm font-medium text-destructive mt-1">{errors.notes.message}</p>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                更新中...
              </>
            ) : (
              <>
                <Pencil className="w-4 h-4 mr-2" />
                更新
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
