'use client';

import { z } from 'zod';
import { useZodForm } from '@/hooks/useZodForm';
import { useSalon } from '@/hooks/useSalon';
import { Loader2 } from 'lucide-react'
import { Loading, TagInput } from '@/components/common'
import { ZodTextField } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useMutation } from 'convex/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/convex/_generated/api'
import { handleErrorToMsg } from '@/lib/error'
import { useRouter } from 'next/navigation'
import { GENDER_VALUES, Gender } from '@/services/convex/shared/types/common'
import {
  Select,
  SelectItem,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const schemaCustomer = z.object({
  lineId: z.string().max(100, { message: 'LINE IDは100文字以内で入力してください' }).optional(), // LINE ID
  lineUserName: z
    .string()
    .max(100, { message: 'LINEユーザー名は100文字以内で入力してください' })
    .optional(), // LINEユーザー名
  phone: z
    .string()
    .min(7, { message: '電話番号は7文字以上で入力してください' })
    .max(15, { message: '電話番号は15文字以内で入力してください' })
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
  firstName: z
    .string()
    .min(1, { message: '名前は1文字以上で入力してください' })
    .max(100, { message: '名前は100文字以内で入力してください' }), // 名前
  lastName: z
    .string()
    .min(1, { message: '苗字は1文字以上で入力してください' })
    .max(100, { message: '苗字は100文字以内で入力してください' }), // 苗字
  useCount: z.number().max(9999, { message: '利用回数は9999回以内で入力してください' }).optional(), // 利用回数
  lastReservationDateUnix: z
    .number()
    .max(9999999999, { message: '最終予約日は9999999999以下で入力してください' })
    .optional(), // 最終予約日
  tags: z.array(z.string()).max(5, { message: 'タグは5つ以内で入力してください' }).optional(), // タグ
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
      .max(9999, { message: '年齢は9999以下で入力してください' })
      .nullable() // null を許容する (preprocessでundefinedに変換しているので必須ではないが残しておく)
      .optional() // undefined を許容する
  ), // 年齢
  birthday: z.string().max(100, { message: '誕生日は100文字以内で入力してください' }).optional(), // 誕生日
  gender: z.enum(GENDER_VALUES).optional(), // 性別
  notes: z.string().max(1000, { message: 'メモは1000文字以内で入力してください' }).optional(), // メモ
  totalPoints: z.preprocess(
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
    z.number().max(9999999999, { message: 'ポイントは9999999999以下で入力してください' }).optional() // ポイント
  ),
})

export default function CustomerAddForm() {
  const { salon } = useSalon()
  const router = useRouter()
  const [currentTags, setCurrentTags] = useState<string[]>([])
  const createCompleteFields = useMutation(api.customer.core.mutation.createCompleteFields)
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting, isDirty },
    watch,
  } = useZodForm(schemaCustomer)

  const onSubmit = async (data: z.infer<typeof schemaCustomer>) => {
    console.log(data)
    if (!salon) return
    try {
      // mutationに渡す前に、nullのフィールドをundefinedに変換
      const body = {
        ...data,
        salonId: salon._id,
        tags: currentTags,
        lastTransactionDateUnix: new Date().getTime() / 1000,
        // ageがnullの場合はundefinedに変換
        age: data.age === null ? undefined : data.age,
        // useCountがnullの場合はundefinedに変換 (必要に応じて他の数値フィールドも同様に)
        useCount: data.useCount === null ? undefined : data.useCount,
        // totalPointsがnullの場合はundefinedに変換 (必要に応じて他の数値フィールドも同様に)
        totalPoints: data.totalPoints === null ? undefined : data.totalPoints,
        // lastReservationDateUnix は常に数値がセットされるため変換不要
      }

      await createCompleteFields(body)
      toast.success('顧客を追加しました')
      router.push('/dashboard/customer')
    } catch (error) {
      toast.error(handleErrorToMsg(error))
    }
  }

  if (!salon) {
    return <Loading />
  }

  console.log(errors)
  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <h4 className="text-sm font-bold mb-1">顧客情報</h4>
          <p className="text-xs text-gray-500 mb-4">予約に必要な基本情報を入力してください。</p>
          <div className="grid grid-cols-2 gap-4">
            <ZodTextField label="姓(苗字)" name="lastName" register={register} errors={errors} />
            <ZodTextField label="名(名前)" name="firstName" register={register} errors={errors} />
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
        <Textarea
          placeholder="メモを入力"
          {...register('notes')}
          className="resize-none"
          rows={5}
        />

        <div>
          <h4 className="text-sm font-bold mb-1">ポイント</h4>
          <p className="text-xs text-gray-500 mb-4">
            ※登録時にポイントを入力すると、登録に顧客のポイントが加算されます。
          </p>
          <div className="grid grid-cols-2 gap-4">
            <ZodTextField
              label="ポイント"
              type="number"
              name="totalPoints"
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
