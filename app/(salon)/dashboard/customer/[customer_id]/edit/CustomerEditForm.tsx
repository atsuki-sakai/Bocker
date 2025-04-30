'use client'

import { useParams } from 'next/navigation'
import { Id } from '@/convex/_generated/dataModel'
import { api } from '@/convex/_generated/api'
import { useQuery } from 'convex/react'
import { z } from 'zod'
import { Gender } from '@/services/convex/shared/types/common'
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
import { useSalon } from '@/hooks/useSalon'
import { useEffect } from 'react' // useState for age display removed, calculate directly from watch
import { useZodForm } from '@/hooks/useZodForm'
import { Button } from '@/components/ui/button'
import { GENDER_VALUES } from '@/services/convex/shared/types/common'
import { MAX_NOTES_LENGTH, MAX_TEXT_LENGTH, MAX_TAG_LENGTH } from '@/services/convex/constants'
import { Loader2, Pencil } from 'lucide-react'
// import { Controller } from 'react-hook-form'; // Unused
import { useMutation } from 'convex/react'
import { handleErrorToMsg, throwConvexError } from '@/lib/error'
import { Loading } from '@/components/common'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'

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
  lastName: z
    .string()
    .min(1, { message: '苗字は必須です' })
    .max(MAX_TEXT_LENGTH, { message: `苗字は${MAX_TEXT_LENGTH}文字以内で入力してください` }),
  firstName: z
    .string()
    .min(1, { message: '名前は必須です' })
    .max(MAX_TEXT_LENGTH, { message: `名前は${MAX_TEXT_LENGTH}文字以内で入力してください` }),
  phone: z
    .string()
    .min(1, { message: '電話番号は必須です' })
    .max(MAX_TEXT_LENGTH, { message: `電話番号は${MAX_TEXT_LENGTH}文字以内で入力してください` }),
  email: z
    .string()
    .email({ message: 'メールアドレスが不正です' })
    .max(MAX_TEXT_LENGTH, {
      message: `メールアドレスは${MAX_TEXT_LENGTH}文字以内で入力してください`,
    })
    .optional()
    .or(z.literal('')),

  gender: z.enum(GENDER_VALUES).default('unselected'),
  birthday: z.string().optional().or(z.literal('')),

  notes: z
    .string()
    .max(MAX_NOTES_LENGTH, { message: `メモは${MAX_NOTES_LENGTH}文字以内で入力してください` })
    .optional()
    .or(z.literal('')),
  totalPoints: z.preprocess(
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

export default function CustomerEditForm() {
  const params = useParams()
  const { salonId } = useSalon()
  const router = useRouter()
  const customerId =
    typeof params.customer_id === 'string' ? (params.customer_id as Id<'customer'>) : undefined

  const completeCustomer = useQuery(
    api.customer.core.query.completeCustomer,
    customerId ? { customerId } : 'skip'
  )

  const updateRelatedTables = useMutation(api.customer.core.mutation.updateRelatedTables)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
    setValue,
    watch,
  } = useZodForm(customerEditFormSchema)

  // Get register object for birthday to access its onChange handler
  const birthdayRegister = register('birthday')

  // Effect to reset form with fetched data once available
  useEffect(() => {
    if (completeCustomer) {
      reset({
        lastName: completeCustomer.customer?.lastName ?? '',
        firstName: completeCustomer.customer?.firstName ?? '',
        phone: completeCustomer.customer?.phone ?? '',
        email: completeCustomer.customer?.email ?? '',
        birthday: completeCustomer.customerDetails?.birthday ?? '',
        gender: completeCustomer.customerDetails?.gender ?? 'unselected',
        notes: completeCustomer.customerDetails?.notes ?? '',
        tags: completeCustomer.customer?.tags ?? [],
        totalPoints: completeCustomer.customerPoints?.totalPoints ?? 0,
      })
    }
  }, [completeCustomer, reset]) // Depend on completeCustomer and reset

  const onSubmit = async (data: z.infer<typeof customerEditFormSchema>) => {
    console.log('Submitting Form Data:', data)

    if (!completeCustomer || !completeCustomer.customer || !completeCustomer.customerDetails) {
      toast.error('顧客データの読み込みが完了していません。')
      return
    }

    if (!salonId) {
      throw throwConvexError({
        message: 'サロンが見つかりません',
        status: 404,
        code: 'NOT_FOUND',
        title: 'サロンが見つかりません',
        callFunc: 'customer.edit.onSubmit',
        severity: 'low',
        details: { salonId },
      })
    }

    try {
      const calculatedAge = calculateAge(data.birthday)

      const payload = {
        salonId: salonId,
        customerId: completeCustomer.customer._id,

        // Editable fields - use data from the form
        phone: data.phone,
        email: data.email ?? '',
        firstName: data.firstName,
        lastName: data.lastName,
        tags: data.tags ?? [],
        age: calculatedAge, // Send calculated age based on submitted birthday
        birthday: data.birthday ?? '',
        gender: data.gender ?? 'unselected',
        notes: data.notes ?? '',
        totalPoints: data.totalPoints ?? 0, // Use submitted points, default to 0 if null/undefined after preprocess

        // Non-editable/Derived fields - use data from the original fetch
        lineId: completeCustomer.customer.lineId ?? '',
        lineUserName: completeCustomer.customer.lineUserName ?? '',
        // Recalculate fullName based on submitted first/last name
        fullName: `${data.lastName} ${data.firstName} ${completeCustomer.customer.lineUserName ? `(${completeCustomer.customer.lineUserName})` : ''}`,
        useCount: completeCustomer.customer.useCount,
        lastReservationDate_unix: completeCustomer.customer.lastReservationDate_unix,
        lastTransactionDate_unix: completeCustomer.customerPoints?.lastTransactionDate_unix,
      }

      await updateRelatedTables(payload)

      toast.success('顧客情報を更新しました')

      router.push(`/dashboard/customer/${customerId}`)
    } catch (error) {
      toast.error(handleErrorToMsg(error))
      console.error('Update failed:', error)
    }
  }

  console.log('watch(gender):', watch('gender'))
  // Show loading state while fetching initial data or if salonId is missing
  if (!completeCustomer || !salonId || !watch('gender')) {
    return <Loading />
  }

  // Calculate age for display directly from the watched birthday
  const displayAge = calculateAge(watch('birthday'))

  return (
    <div className="container mx-auto py-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="grid grid-cols-2 gap-6 col-span-1">
            <ZodTextField
              label="苗字"
              register={register}
              errors={errors}
              name="lastName"
              placeholder="苗字を入力してください"
            />
            <ZodTextField
              label="名前"
              register={register}
              errors={errors}
              name="firstName"
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

        {/* Age, Gender, Birthday, Points section */}
        {/* Age and Gender Display */}
        <div className="flex items-center gap-2">
          <p className="text-lg text-slate-700">
            {/* Display age or '-' */}
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
            {/* Points Field */}
            <div>
              <ZodTextField
                label="保有ポイント"
                register={register}
                errors={errors}
                name="totalPoints"
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
                value={
                  watch('gender') ? watch('gender') : completeCustomer?.customerDetails?.gender
                }
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
                // Spread the rest of the register props (name, onBlur, ref)
                {...birthdayRegister}
                // Add manual onChange BUT make sure to call the registered onChange too
                onChange={(e) => {
                  // 1. Call the onChange provided by react-hook-form register
                  birthdayRegister.onChange(e)
                  // 2. Perform your additional logic (e.g., update display age)
                  //    The display age is already calculated from watchedBirthday,
                  //    which will update after birthdayRegister.onChange(e) is called.
                  //    So, no need for setAge state or extra logic here.
                  console.log('Birthday input changed:', e.target.value) // Optional: Log change
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
            {' '}
            {/* Button disabled if not dirty */}
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
