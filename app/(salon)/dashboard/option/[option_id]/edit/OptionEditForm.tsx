'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel'
import { useZodForm } from '@/hooks/useZodForm'
import { z } from 'zod'
import { Loading, ZodTextField } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { handleErrorToMsg } from '@/lib/error'
import { useSalon } from '@/hooks/useSalon'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import { TagInput } from '@/components/common'
import { getMinuteMultiples } from '@/lib/schedule' // getMinuteMultiplesを追加
import {
  Tag,
  DollarSign,
  ShoppingBag,
  Boxes,
  Info,
  AlertCircle,
  Clock,
  Save,
  Loader2,
} from 'lucide-react' // Clockを追加
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select' // Select関連を追加
// バリデーションスキーマ
const optionSchema = z
  .object({
    name: z
      .string()
      .min(1, { message: 'オプション名は必須です' })
      .max(100, { message: 'オプション名は100文字以内で入力してください' }),
    unitPrice: z
      .number()
      .min(1, { message: '単価は必須です' })
      .max(99999, { message: '単価は99999円以下で入力してください' })
      .nullable()
      .optional()
      .refine((val): val is number => val !== null && val !== undefined, {
        message: '単価は必須です',
      }), // refineを更新
    salePrice: z.preprocess(
      (val) => {
        if (val === '' || val === null || val === undefined) return null
        const num = Number(val)
        return isNaN(num) ? null : num
      },
      z
        .number()
        .max(99999, { message: 'セール価格は99999円以下で入力してください' })
        .nullable()
        .optional()
    ),
    orderLimit: z
      .number()
      .min(1, { message: '最大注文数は1以上で入力してください' })
      .max(99, { message: '最大注文数は99個以下で入力してください' })
      .nullable()
      .refine((val): val is number => val !== null && val !== undefined, {
        message: '最大注文数は必須です',
      }), // refineを更新
    timeToMin: z // timeToMinのバリデーションを追加
      .string()
      .min(1, { message: '時間は必須です' })
      .max(5, { message: '時間は5文字で入力してください' })
      .refine((val) => val !== '', { message: '時間は必須です' })
      .optional(),
    ensureTimeToMin: z // timeToMinのバリデーションを追加
      .string()
      .min(1, { message: '時間は必須です' })
      .max(5, { message: '時間は5文字で入力してください' })
      .refine((val) => val !== '', { message: '時間は必須です' })
      .optional(),
    tags: z.preprocess(
      // tagsのバリデーションを追加
      (val) => (typeof val === 'string' ? val : Array.isArray(val) ? val.join(',') : ''),
      z
        .string()
        .max(100, { message: 'タグは合計100文字以内で入力してください' })
        .transform((val) =>
          val
            ? val
                .replace(/[,、]/g, ',')
                .split(',')
                .map((tag) => tag.trim())
                .filter((tag) => tag !== '')
            : []
        )
        .refine((val) => val.length <= 5, { message: 'タグは最大5つまでです' })
        .optional()
    ),
    description: z
      .string()
      .max(1000, { message: '説明は1000文字以内で入力してください' })
      .optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // salePriceが存在し、unitPriceも存在する場合のみ比較
      if (
        data.salePrice !== null &&
        data.salePrice !== undefined &&
        data.unitPrice !== null &&
        data.unitPrice !== undefined &&
        data.salePrice >= data.unitPrice
      ) {
        return false
      }
      return true
    },
    {
      message: 'セール価格は通常価格より低く設定してください',
      path: ['salePrice'],
    }
  )
  .refine(
    (data) => {
      // 両方のフィールドが存在する場合のみ比較を行う
      if (data.timeToMin !== undefined && data.ensureTimeToMin !== undefined) {
        // 検証失敗条件: 確保する時間(ensureTimeToMin)が実際の稼働時間(timeToMin)より大きい場合
        if (data.ensureTimeToMin < data.timeToMin) {
          return false // 検証失敗
        }
      }
      // 上記以外のケース（比較しない場合、または ensureTimeToMin <= timeToMin の場合）は検証成功
      return true
    },
    {
      message: '確保する時間は実際の稼働時間以下に設定してください', // メッセージも少し調整するとより適切かもしれません
      path: ['ensureTimeToMin'], // エラーメッセージをensureTimeToMinフィールドに表示
    }
  )

// エラーメッセージコンポーネント
const ErrorMessage = ({ message }: { message: string | undefined }) => (
  <motion.p
    className="text-red-500 text-sm mt-1 flex items-center gap-1"
    initial={{ opacity: 0, height: 0 }}
    animate={{ opacity: 1, height: 'auto' }}
    exit={{ opacity: 0, height: 0 }}
  >
    <AlertCircle size={14} /> {message ?? 'NULL'}
  </motion.p>
)

export default function OptionEditForm() {
  const router = useRouter()
  const params = useParams()
  const optionId = params.option_id as Id<'salon_option'>
  const { salon } = useSalon()
  const optionData = useQuery(api.option.query.get, { optionId })
  const updateOption = useMutation(api.option.mutation.update)

  const [isInitialized, setIsInitialized] = useState(false)
  const [currentTags, setCurrentTags] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting, errors },
  } = useZodForm(optionSchema)
  const isActive = watch('isActive')
  const watchTimeToMin = watch('timeToMin')

  // データ取得後にフォームを初期化
  useEffect(() => {
    if (optionData && !isInitialized) {
      const timeToMinValueString = optionData.timeToMin?.toString() || undefined
      const ensureTimeToMinValueString = optionData.ensureTimeToMin?.toString() || undefined
      const initialTags = optionData.tags || []

      // Stateの更新
      setCurrentTags(initialTags)

      // setValueで各フィールドの初期値を設定
      setValue('name', optionData.name || '')
      setValue('unitPrice', optionData.unitPrice ?? 1)
      setValue('salePrice', optionData.salePrice ?? undefined)
      setValue('orderLimit', optionData.orderLimit ?? 1)
      setValue('timeToMin', timeToMinValueString)
      setValue('ensureTimeToMin', ensureTimeToMinValueString)
      setValue('tags', initialTags)
      setValue('description', optionData.description || '')
      setValue('isActive', optionData.isActive ?? true)

      setIsInitialized(true)
    }
  }, [optionData, setValue, isInitialized])

  // フォーム送信処理
  const onSubmit = async (data: z.infer<typeof optionSchema>) => {
    try {
      if (!salon?._id || !optionId) {
        toast.error('サロン情報またはオプション情報が見つかりません')
        return
      }

      // APIに送信するデータを作成
      // zod schemaで型変換後のデータを使用
      const updateData = {
        name: data.name,
        unitPrice: data.unitPrice,
        salePrice: data.salePrice ? Number(data.salePrice) : 0,
        orderLimit: data.orderLimit,
        timeToMin: data.timeToMin ? Number(data.timeToMin) : undefined, // 文字列を数値 or undefined に変換
        ensureTimeToMin: data.ensureTimeToMin ? Number(data.ensureTimeToMin) : undefined, // 文字列を数値 or undefined に変換
        tags: data.tags, // zodで変換された配列 or undefined
        description: data.description,
        isActive: data.isActive,
        optionId, // idは必須
      }

      await updateOption(updateData)

      toast.success('オプションを更新しました')
      router.push('/dashboard/option')
    } catch (error) {
      toast.error(handleErrorToMsg(error))
    }
  }

  if (!salon || !optionData) {
    return <Loading />
  }

  return (
    <div>
      <form
        onSubmit={handleSubmit(onSubmit)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
            e.preventDefault()
          }
        }}
      >
        <div className="mb-8">
          <h4 className="text-lg font-bold mb-2">オプション基本情報</h4>
          <div className="space-y-6">
            <div className="flex gap-4">
              <ZodTextField
                name="name"
                label="オプション名"
                icon={<Tag className="text-gray-500" />}
                placeholder="オプション名を入力してください"
                register={register}
                errors={errors}
                required
                className="border-gray-200 focus-within:border-blue-500 transition-colors w-full"
              />

              <ZodTextField
                name="orderLimit"
                label="最大注文数"
                icon={<Boxes className="text-gray-500" />}
                type="number"
                placeholder="例: 5"
                register={register}
                errors={errors}
                required
                className="border-gray-200 focus-within:border-blue-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ZodTextField
                name="unitPrice"
                label="単価"
                icon={<DollarSign className="text-gray-500" />}
                type="number"
                placeholder="例: 1000"
                register={register}
                errors={errors}
                required
                className="border-gray-200 focus-within:border-blue-500 transition-colors"
              />

              <ZodTextField
                name="salePrice"
                label="セール価格"
                type="number"
                icon={<ShoppingBag className="text-gray-500" />}
                placeholder="例: 800"
                register={register}
                errors={errors}
                className="border-gray-200 focus-within:border-blue-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="w-full">
                <Label className="text-sm flex items-center gap-2">
                  <Clock size={16} className="text-gray-500" />
                  実際にスタッフが稼働する施術時間
                </Label>

                <Select
                  value={watchTimeToMin?.toString() ?? ''}
                  onValueChange={(value) => {
                    if (!value.trim()) return
                    const numValue = Number(value)
                    setValue('timeToMin', value, { shouldValidate: true })
                    console.log('実際にスタッフが稼働する施術時間を選択:', { value, numValue }) // デバッグ用
                  }}
                >
                  <SelectTrigger className="border-gray-200 focus:border-blue-500 transition-colors">
                    <SelectValue placeholder="実際にスタッフが稼働する施術時間を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {getMinuteMultiples(5, 360).map((time) => (
                      <SelectItem key={time} value={time.toString()}>
                        {time}分
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-gray-500">
                  スタッフが手を動かして施術に集中している正味の作業時間を指します。
                </span>
                {errors.timeToMin && <ErrorMessage message={errors.timeToMin.message} />}
              </div>
              <div className="w-full">
                <Label className="text-sm flex items-center gap-2">
                  <Clock size={16} className="text-gray-500" />
                  待機時間なども含めたトータルの施術時間
                </Label>
                <Select
                  value={watch('ensureTimeToMin')?.toString() ?? ''}
                  onValueChange={(value) => {
                    if (!value.trim()) return
                    const numValue = Number(value)
                    setValue('ensureTimeToMin', value, { shouldValidate: true })
                    console.log('待機時間を含めたトータルの施術時間を選択:', { value, numValue }) // デバッグ用
                  }}
                >
                  <SelectTrigger className="border-gray-200 focus:border-blue-500 transition-colors">
                    <SelectValue placeholder="待機時間を含めたトータルの施術時間を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {getMinuteMultiples(5, 360).map((time) => (
                      <SelectItem key={time} value={time.toString()}>
                        {time}分
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-gray-500">
                  施術席を専有する必要はあるものの、スタッフが別の作業に移れる待機時間を指します。
                </span>
                {errors.ensureTimeToMin && (
                  <ErrorMessage message={errors.ensureTimeToMin.message} />
                )}
              </div>
            </div>
            <TagInput
              tags={currentTags}
              setTagsAction={(tags) => {
                setCurrentTags(tags)
                setValue('tags', tags, { shouldValidate: true })
              }}
            />
          </div>
        </div>

        <Separator className="my-8" />

        {/* 説明セクション */}
        <Label className="flex items-center gap-2 text-sm mb-2 mt-4">
          <Info size={16} className="text-gray-500" />
          オプション説明
        </Label>
        <Textarea
          id="description"
          placeholder="オプションの詳細説明を入力してください（任意）"
          {...register('description')}
          onChange={(e) => setValue('description', e.target.value, { shouldValidate: true })}
          rows={5}
          className="border-gray-200 focus-visible:ring-blue-500 resize-none"
        />
        {errors.description && <ErrorMessage message={errors.description?.message} />}

        {/* 公開/非公開スイッチ */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md mb-6 mt-6">
          <div>
            <p className="text-sm font-medium">オプションを公開する</p>
            <p className="text-xs text-gray-500 mt-1">
              オフにすると、このオプションはお客様に表示されません
            </p>
          </div>
          <Switch
            id="isActive"
            checked={isActive}
            onCheckedChange={(checked) => setValue('isActive', checked)}
            className="data-[state=checked]:bg-green-600"
          />
        </div>

        <div className="flex justify-end mt-6 w-full">
          <div className="flex justify-between gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/option')}
              className="min-w-28"
            >
              戻る
            </Button>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    更新中...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    オプションを更新
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        </div>
      </form>
      <Accordion type="multiple" className="mt-8 space-y-2">
        {/* 実際の稼働時間と確保する時間の違いについて */}
        <AccordionItem value="line-access-token">
          <AccordionTrigger>
            実際の稼働時間と待機時間を含めたトータルの施術時間の違いについて
          </AccordionTrigger>
          <AccordionContent className="space-y-2 text-sm text-slate-600">
            <ol className="list-decimal list-inside space-y-1 bg-slate-100 p-4 rounded-md">
              <li>
                <strong>実際の稼働時間 :</strong>
                スタッフが手を動かして施術に集中している正味の作業時間を指します。
                <br />
                例）パーマの薬剤塗布・カット・シャンプーなど。
              </li>
              <li>
                <strong>待機時間を含めたトータルの施術時間 :</strong>
                施術席を専有する必要はあるものの、スタッフが別の作業に移れる待機時間を指します。
                <br />
                例）薬剤の放置時間・髪の乾燥時間など。
              </li>
              <li>
                予約枠のアルゴリズムは <strong>実際の稼働時間</strong> を基準に空き時間を算出し、
                <strong>待機時間を含めたトータルの施術時間</strong>{' '}
                を待機時間として扱うことで、同じ席を効率よく回転させられます。
              </li>
            </ol>

            <p className="text-xs text-slate-500 space-y-1">
              * 両時間とも必須入力です。
              <br />* <strong>入力例：</strong> パーマ 90 分（実際の稼働 45 分 ＋ 確保 45
              分）の場合、スタッフは途中 45 分間ほかの顧客を担当できます。
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
