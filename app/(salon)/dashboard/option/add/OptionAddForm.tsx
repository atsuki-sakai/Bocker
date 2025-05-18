'use client';
import { useSalon } from '@/hooks/useSalon';
import { z } from 'zod';
import { Info } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { MAX_TEXT_LENGTH } from '@/services/convex/constants';
import { useZodForm } from '@/hooks/useZodForm';
import { api } from '@/convex/_generated/api';
import { useMutation } from 'convex/react'
import { TagInput, ImageDrop } from '@/components/common'
import { Button } from '@/components/ui/button'
import { ZodTextField } from '@/components/common'
import { Label } from '@/components/ui/label'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import { useEffect, useState, memo } from 'react'
import { toast } from 'sonner'
import { DollarSign, ShoppingBag, Clock, Save, Loader2, ImageIcon } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { getMinuteMultiples } from '@/lib/schedule'
import { Loading } from '@/components/common'
import { useRouter } from 'next/navigation'
import { handleErrorToMsg } from '@/lib/error'
import { fileToBase64 } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ProcessedImageResult } from '@/services/image/image.types'

// APIレスポンスの型定義
type StorageApiResponse = ProcessedImageResult | { error: string }

// 施術時間：0〜360分の5分刻みをキャッシュ
const MINUTE_OPTIONS = getMinuteMultiples(0, 360)

const optionSchema = z
  .object({
    name: z
      .string({
        required_error: 'オプションメニュー名は必須です',
        invalid_type_error: 'オプションメニュー名は有効な文字列で入力してください',
      })
      .min(1, { message: 'オプションメニュー名は必須です' })
      .max(MAX_TEXT_LENGTH, {
        message: `オプションメニュー名は${MAX_TEXT_LENGTH}文字以内で入力してください`,
      }), // オプションメニュー名
    unitPrice: z.preprocess(
      (val) => {
        // 空文字列、null、undefinedの場合はundefinedを返し、required_errorをトリガー
        if (val === '' || val === null || val === undefined) return undefined
        // 数値に変換できない場合は元の値を返し、invalid_type_errorをトリガー
        const num = Number(val)
        return isNaN(num) ? val : num
      },
      z
        .number({
          required_error: '価格は必須です',
          invalid_type_error: '価格は有効な数値で入力してください',
        })
        .min(1, { message: '価格は1円以上で入力してください' })
        .max(99999, { message: '価格は99999円以下で入力してください' })
    ), // 価格
    salePrice: z.preprocess(
      (val) => {
        // 空文字列、null、undefinedの場合はnullを返し、nullable()で許容
        if (val === '' || val === null || val === undefined) return null
        // 数値に変換できない場合は元の値を返し、invalid_type_errorをトリガー
        const num = Number(val)
        return isNaN(num) ? val : num
      },
      z
        .number()
        .max(99999, { message: 'セール価格は99999円以下で入力してください' })
        .nullable()
        .optional()
    ), // セール価格
    orderLimit: z.preprocess(
      (val) => {
        // 空文字列の場合はnullを返す
        if (val === '' || val === null || val === undefined) return null
        // 数値に変換できない場合は1を返す
        const num = Number(val)
        return isNaN(num) ? 1 : num
      },
      z
        .number({
          required_error: '注文制限は必須です',
          invalid_type_error: '注文制限は有効な数値で入力してください',
        })
        .min(0, { message: '注文制限は0以上で入力してください' })
        .max(5, { message: '注文制限は5以下で入力してください' })
        .optional()
    ), // 注文制限
    inStock: z.preprocess(
      (val) => {
        // 空文字列の場合はnullを返す
        if (val === '' || val === null || val === undefined) return null
        // 数値に変換できない場合は1を返す
        const num = Number(val)
        return isNaN(num) ? 1 : num
      },
      z.number().max(1000, { message: '在庫数は1000以下で入力してください' }).optional()
    ),
    timeToMin: z
      .string({
        required_error: '時間は必須です',
        invalid_type_error: '時間は有効な数値で入力してください',
      })
      .min(1, { message: '時間は必須です' })
      .max(5, { message: '時間は5文字で入力してください' })
      .refine((val) => val !== '', { message: '時間は必須です' }), // 時間(分)
    tags: z.preprocess(
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
    ), // タグ
    description: z
      .string({
        required_error: '説明は必須です',
        invalid_type_error: '説明は有効な文字列で入力してください',
      })
      .min(1, { message: '説明は必須です' })
      .max(1000, { message: '説明は1000文字以内で入力してください' }), // 説明
    isActive: z.boolean({ message: '有効/無効フラグは必須です' }), // 有効/無効フラグ
    imgPath: z.string().max(512).optional(),
    thumbnailPath: z.string().max(512).optional(),
  })
  .refine(
    (data) => {
      // salePriceが存在する場合のみ、priceとの比較を行う
      if (data.salePrice && data.unitPrice && data.salePrice >= data.unitPrice) {
        return false
      }
      return true
    },
    {
      message: 'セール価格は通常価格より低く設定してください',
      path: ['salePrice'], // エラーメッセージをsalePriceフィールドに表示
    }
  )

function OptionAddForm() {
  const { salon } = useSalon()
  const router = useRouter()
  const [currentTags, setCurrentTags] = useState<string[]>([])
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const addOption = useMutation(api.option.mutation.create)

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors, isDirty },
    setValue,
    watch,
    reset,
  } = useZodForm(optionSchema)

  const isActive = watch('isActive')

  const onSubmit = async (data: z.infer<typeof optionSchema>) => {
    // 画像がある場合はアップロード処理を行う
    let uploadedOriginalUrl: string | undefined = undefined
    let uploadedThumbnailUrl: string | undefined = undefined

    try {
      if (!salon?._id) {
        toast.error('サロン情報が必要です')
        return
      }

      if (currentFile) {
        try {
          setIsUploading(true)
          const base64Data = await fileToBase64(currentFile!)
          const result = await fetch('/api/storage', {
            method: 'POST',
            body: JSON.stringify({
              base64Data,
              fileName: currentFile!.name,
              directory: 'option',
              salonId: salon._id,
              quality: 'low',
            }),
          })
          const responseData = (await result.json()) as StorageApiResponse

          if ('error' in responseData) {
            toast.error(responseData.error)
            setIsUploading(false) // エラー時は uploading を解除
            return
          }
          uploadedOriginalUrl = responseData.imgUrl
          uploadedThumbnailUrl = responseData.thumbnailUrl
        } catch (error) {
          toast.error(handleErrorToMsg(error))
          setIsUploading(false) // エラー時は uploading を解除
          toast.error(handleErrorToMsg(error))
          return
        } finally {
          setIsUploading(false)
        }
      }

      // APIに送信するデータを作成
      const createData = {
        name: data.name,
        salonId: salon._id,
        timeToMin: Number(data.timeToMin),
        inStock: data.inStock,
        salePrice: data.salePrice ? Number(data.salePrice) : (undefined as unknown as number),
        unitPrice: Number(data.unitPrice), // 明示的に数値型に変換
        orderLimit: data.orderLimit,
        tags: data.tags,
        description: data.description,
        isActive: data.isActive,
        imgPath: uploadedOriginalUrl,
        thumbnailPath: uploadedThumbnailUrl,
      }

      await addOption(createData)
      toast.success('オプションメニューを登録しました')
      router.push('/dashboard/option')
    } catch (error) {
      // メニュー作成に失敗した場合、新しくアップロードした画像を削除
      if (uploadedOriginalUrl && currentFile) {
        try {
          await fetch('/api/storage', {
            method: 'DELETE',
            body: JSON.stringify({
              imgUrl: uploadedOriginalUrl,
              withThumbnail: true,
            }),
          })
        } catch (deleteErr) {
          console.error('Failed to delete new original image after update failure:', deleteErr)
        }
      }

      if (uploadedThumbnailUrl && currentFile) {
        try {
          await fetch('/api/storage', {
            method: 'DELETE',
            body: JSON.stringify({
              imgUrl: uploadedThumbnailUrl,
              withThumbnail: true,
            }),
          })
        } catch (deleteErr) {
          console.error('Failed to delete new thumbnail image after update failure:', deleteErr)
        }
      }
      toast.error(handleErrorToMsg(error))
    }
  }

  useEffect(() => {
    if (salon?._id) {
      reset({
        name: undefined as unknown as string,
        unitPrice: undefined as unknown as number,
        salePrice: undefined as unknown as number,
        orderLimit: 1,
        timeToMin: undefined as unknown as string,
        inStock: 1,
        tags: [] as unknown as string[],
        description: undefined as unknown as string,
        isActive: true,
        imgPath: undefined as unknown as string,
        thumbnailPath: undefined as unknown as string,
      })
      setCurrentTags([])
      setCurrentFile(null)
    }
  }, [salon?._id, reset])

  if (!salon) {
    return <Loading />
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
          e.preventDefault()
        }
      }}
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-1">
            <Card className="border border-dashed h-full flex flex-col">
              <CardHeader className="pb-0">
                <CardTitle className="text-base flex items-center gap-2 mb-2">
                  <ImageIcon size={18} className="text-muted-foreground" />
                  オプションメニュー画像
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow flex items-center justify-center">
                <div className="w-full">
                  <ImageDrop
                    maxSizeMB={5}
                    onFileSelect={(files) => {
                      setCurrentFile(files[0] ?? null)
                    }}
                    className="rounded-md"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full">
                <ZodTextField
                  register={register}
                  name="name"
                  label="オプションメニュー名"
                  placeholder="オプションメニュー名"
                  errors={errors}
                  required
                />
              </div>
              <ZodTextField
                name="orderLimit"
                label="最大注文数"
                type="number"
                placeholder="例: 1"
                register={register}
                errors={errors}
                required
                className="border-border focus-within:border-active transition-colors"
              />
              <ZodTextField
                name="inStock"
                label="在庫数"
                type="number"
                placeholder="例: 1"
                register={register}
                errors={errors}
                required
                className="border-border focus-within:border-active transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <ZodTextField
                name="unitPrice"
                label="通常価格"
                icon={<DollarSign className="text-primary" />}
                type="number"
                placeholder="例: 5000"
                register={register}
                errors={errors}
                required
                className="border-border focus-within:border-active transition-colors"
              />

              <ZodTextField
                name="salePrice"
                label="セール価格"
                type="number"
                icon={<ShoppingBag className="text-primary" />}
                placeholder="例: 4000"
                register={register}
                errors={errors}
                className="border-border focus-within:border-active transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="w-full">
                <Label className="text-sm flex items-center gap-2 mb-2">
                  <Clock size={16} className="text-primary" />
                  スタッフが稼働する施術時間 <span className="text-destructive ml-1">*</span>
                </Label>
                <Select
                  onValueChange={(value) => {
                    setValue('timeToMin', value, { shouldValidate: true })
                  }}
                >
                  <SelectTrigger className="border-border transition-colors">
                    <SelectValue placeholder="スタッフが稼働する施術時間を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {MINUTE_OPTIONS.map((time) => (
                      <SelectItem key={time} value={time.toString()}>
                        {time}分
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">
                  メニューの実作業時間を設定します。
                </span>
                {errors.timeToMin && (
                  <p className="text-destructive text-sm mt-1">{errors.timeToMin.message}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <TagInput
          tags={currentTags}
          setTagsAction={setCurrentTags}
          error={errors.tags?.message}
          title="タグ"
          exampleText="例: 期間限定、セール、デートなど"
        />

        <Label className="flex items-center gap-2 text-sm mt-4">
          <Info size={16} className="text-primary" />
          オプションメニュー説明 <span className="text-destructive ml-1">*</span>
        </Label>
        <Textarea
          id="description"
          placeholder="オプションメニューの詳細説明を入力してください"
          {...register('description')}
          onChange={(e) => setValue('description', e.target.value, { shouldValidate: true })}
          rows={8}
          className="border-border focus-visible:ring-active"
        />
        {errors.description && (
          <p className="text-destructive text-sm mt-1">{errors.description.message}</p>
        )}

        <div className="flex items-center justify-between p-4 bg-muted rounded-md mb-6 mt-4">
          <div>
            <p className="text-sm font-bold">オプションメニューを公開する</p>
            <p className="text-xs text-muted-foreground">
              オフにすると、このオプションメニューはお客様に表示されません
            </p>
          </div>
          <Switch
            id="isActive"
            checked={isActive}
            onCheckedChange={() => setValue('isActive', !isActive)}
            className="data-[state=checked]:bg-active"
          />
        </div>

        <div className="flex justify-end">
          <Button
            variant="default"
            type="submit"
            disabled={isSubmitting || isUploading || !isDirty}
            onClick={() => {
              console.log('ボタンクリック')
              console.log('フォームバリデーション状態:', errors)
            }}
          >
            {isSubmitting || isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                追加中...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                オプションを追加
              </>
            )}
          </Button>
        </div>
      </div>
      <Accordion type="multiple" className="mt-8 space-y-2">
        {/* 実際の稼働時間と確保する時間の違いについて */}
        <AccordionItem value="line-access-token">
          <AccordionTrigger>
            実際の稼働時間と待機時間を含めたトータルの施術時間の違いについて
          </AccordionTrigger>
          <AccordionContent className="space-y-2 text-sm text-muted-foreground leading-6">
            <ol className="list-decimal list-inside space-y-1 bg-muted p-4 rounded-md">
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
    </form>
  )
}

export default memo(OptionAddForm);
