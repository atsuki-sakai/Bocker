'use client'

import { z } from 'zod'
import { useZodForm } from '@/hooks/useZodForm'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import { Loader2 } from 'lucide-react'
import { Loading, TagInput } from '@/components/common'
import { ZodTextField } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { GENDER_VALUES, Gender } from '@/convex/types'
import { CustomerRepository } from '@/services/supabase/repositories/customer/CustomerRepository'
import {
  Select,
  SelectItem,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  MAX_NUM,
  MAX_TEXT_LENGTH,
  MAX_PHONE_LENGTH,
  MAX_TAG_LENGTH,
  MAX_NOTES_LENGTH,
} from '@/convex/constants'

const schemaCustomer = z.object({
  line_id: z
    .string()
    .max(MAX_TEXT_LENGTH, {
      message: `LINE IDは${MAX_TEXT_LENGTH}文字以内で入力してください`,
    })
    .optional(), // LINE ID
  line_user_name: z
    .string()
    .max(MAX_TEXT_LENGTH, {
      message: `LINEユーザー名は${MAX_TEXT_LENGTH}文字以内で入力してください`,
    })
    .optional(), // LINEユーザー名
  phone: z
    .string()
    .min(6, {
      message: `電話番号は6文字以上で入力してください`,
    })
    .max(MAX_PHONE_LENGTH, {
      message: `電話番号は${MAX_PHONE_LENGTH}文字以内で入力してください`,
    })
    .refine((value) => value === undefined || /^[0-9]+$/.test(value), {
      message: '電話番号は数字で入力してください',
    }), // 電話番号
  email: z.preprocess(
    (val) => {
      if (typeof val === 'string' && val.trim() === '') {
        return undefined
      }
      return val
    },
    z
      .string()
      .max(100, { message: 'メールアドレスは100文字以内で入力してください' })
      .optional()
      .refine(
        (value) =>
          value === undefined || /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value),
        { message: 'メールアドレスの形式が正しくありません' }
      ) // メールアドレス
  ),
  first_name: z
    .string()
    .min(1, { message: '名前は1文字以上で入力してください' })
    .max(MAX_TEXT_LENGTH, { message: `名前は${MAX_TEXT_LENGTH}文字以内で入力してください` }), // 名前
  last_name: z
    .string()
    .min(1, { message: '苗字は1文字以上で入力してください' })
    .max(MAX_TEXT_LENGTH, { message: `苗字は${MAX_TEXT_LENGTH}文字以内で入力してください` }), // 苗字
  total_reservation_count: z
    .number()
    .max(MAX_NUM, { message: `利用回数は${MAX_NUM}回以内で入力してください` })
    .optional(), // 利用回数
  last_reservation_date_unix: z
    .number()
    .max(MAX_NUM, { message: `最終予約日は${MAX_NUM}以下で入力してください` })
    .optional(), // 最終予約日
  tags: z
    .array(z.string())
    .max(MAX_TAG_LENGTH, { message: `タグは${MAX_TAG_LENGTH}つ以内で入力してください` })
    .optional(), // タグ
  age: z.preprocess(
    (val) => {
      // 空文字列、null、または NaN の場合に undefined に変換する
      if (
        (typeof val === 'string' && val.trim() === '') ||
        val === null ||
        (typeof val === 'number' && isNaN(val))
      ) {
        return undefined
      }
      // それ以外の値（数値、空でない文字列など）はそのまま通過
      return val
    },
    z
      .number()
      .min(0)
      .max(MAX_NUM, { message: `年齢は${MAX_NUM}以下で入力してください` })
      .nullable() // null を許容する (preprocessでundefinedに変換しているので必須ではないが残しておく)
      .optional() // undefined を許容する
  ), // 年齢
  birthday: z.string().max(100, { message: '誕生日は100文字以内で入力してください' }).optional(), // 誕生日
  gender: z.enum(GENDER_VALUES).optional(), // 性別
  notes: z
    .string()
    .max(MAX_NOTES_LENGTH, { message: `メモは${MAX_NOTES_LENGTH}文字以内で入力してください` })
    .optional(), // メモ
  total_points: z.preprocess(
    (val) => {
      // 空文字列、null、または NaN の場合に undefined に変換する
      if (
        (typeof val === 'string' && val.trim() === '') ||
        val === null ||
        (typeof val === 'number' && isNaN(val))
      ) {
        return undefined
      }
      // それ以外の値（数値、空でない文字列など）はそのまま通過
      return val
    },
    z
      .number()
      .max(MAX_NUM, { message: `ポイントは${MAX_NUM}以下で入力してください` })
      .optional() // ポイント
  ),
})

export default function CustomerAddForm() {
  const { tenantId, orgId, isLoaded } = useTenantAndOrganization()
  const router = useRouter()
  const [currentTags, setCurrentTags] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const customerRepo = new CustomerRepository()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isDirty },
    watch,
  } = useZodForm(schemaCustomer)

  const onSubmit = async (data: z.infer<typeof schemaCustomer>) => {
    console.log('フォームデータ:', data)

    if (!tenantId || !orgId) {
      toast.error('テナントIDまたは組織IDが見つかりません')
      return
    }

    setIsSubmitting(true)

    try {
      // 顧客のコア情報を準備
      const customerCoreData = {
        uid: crypto.randomUUID(), // UIDを自動生成
        tenant_id: tenantId,
        org_id: orgId,
        email: data.email || null,
        first_name: data.first_name || null,
        last_name: data.last_name || null,
        phone: data.phone || null,
        line_id: data.line_id || null,
        line_user_name: data.line_user_name || null,
        tags: currentTags,
        total_reservation_count: data.total_reservation_count || null,
        last_reservation_date_unix: data.last_reservation_date_unix || null,
        // その他のフィールドはオプショナルなのでundefinedでも問題なし
      }

      // 顧客詳細情報を準備
      const detailData = {
        email: data.email || null,
        age: data.age || null,
        birthday: data.birthday || null,
        gender: data.gender || null,
        notes: data.notes || null,
        tenant_id: tenantId,
        org_id: orgId,
      }

      // 初期ポイント数を設定
      const initialPoints = data.total_points || 0

      // 顧客、詳細、ポイントを一度に作成
      const result = await customerRepo.createCustomerWithDetailsAndPoints(
        customerCoreData,
        detailData,
        initialPoints
      )

      if (result.customer) {
        toast.success('顧客を追加しました')
        router.push('/dashboard/customer')
      } else {
        toast.error('顧客の作成に失敗しました')
      }
    } catch (error) {
      console.error('顧客作成エラー:', error)
      const errorMessage = error instanceof Error ? error.message : '顧客の作成に失敗しました'
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ローディング状態の確認
  if (!isLoaded) {
    return <Loading />
  }

  console.log('フォームエラー:', errors)

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <h4 className="text-sm font-bold mb-1">顧客情報</h4>
          <p className="text-xs text-gray-500 mb-4">予約に必要な基本情報を入力してください。</p>
          <div className="grid grid-cols-2 gap-4">
            <ZodTextField label="姓(苗字)" name="last_name" register={register} errors={errors} />
            <ZodTextField label="名(名前)" name="first_name" register={register} errors={errors} />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <ZodTextField label="電話番号" name="phone" register={register} errors={errors} />
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold mb-1">マーケティング情報</h4>
          <p className="text-xs text-gray-500 mb-4">
            以下の情報を使用して顧客を特定のグループ毎に分類することができ、マーケティングに活用することができます。
          </p>

          <div className="grid grid-cols-2 gap-4">
            <ZodTextField label="メールアドレス" name="email" register={register} errors={errors} />
            <div>
              <Label>性別</Label>
              <Select
                value={watch('gender') ?? 'unselect'}
                onValueChange={(value) => {
                  setValue('gender', value as Gender)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="性別を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">男性</SelectItem>
                  <SelectItem value="female">女性</SelectItem>
                  <SelectItem value="unselect">未選択</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <ZodTextField label="年齢" type="number" name="age" register={register} errors={errors} />
          <ZodTextField
            label="誕生日"
            type="date"
            name="birthday"
            register={register}
            errors={errors}
          />
        </div>

        <TagInput
          tags={currentTags}
          setTagsAction={setCurrentTags}
          error={errors.tags?.message}
          title="タグ"
          exampleText="例: リピーター, 新規, カラー利用、パーマ利用"
        />

        <div>
          <Label htmlFor="notes">メモ</Label>
          <Textarea
            id="notes"
            placeholder="メモを入力"
            {...register('notes')}
            className="resize-none"
            rows={5}
          />
          {errors.notes && <p className="text-sm text-red-600 mt-1">{errors.notes.message}</p>}
        </div>

        <div>
          <h4 className="text-sm font-bold mb-1">ポイント</h4>
          <p className="text-xs text-gray-500 mb-4">
            ※登録時にポイントを入力すると、登録に顧客のポイントが加算されます。
          </p>
          <div className="grid grid-cols-2 gap-4">
            <ZodTextField
              label="ポイント"
              type="number"
              name="total_points"
              register={register}
              errors={errors}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : '顧客を追加'}
          </Button>
        </div>
      </form>
    </div>
  )
}
