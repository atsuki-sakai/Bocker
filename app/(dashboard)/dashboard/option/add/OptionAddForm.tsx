'use client'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import { z } from 'zod'
import { Info } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { useZodForm } from '@/hooks/useZodForm'
import { api } from '@/convex/_generated/api'
import { useMutation } from 'convex/react'
import { TagInput, SingleImageDrop, Loading, ZodTextField } from '@/components/common'
import { Button } from '@/components/ui/button'
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
import { zNumberFieldOptional } from '@/lib/zod/helpers'
import { getMinuteMultiples } from '@/lib/schedules'
import { useRouter } from 'next/navigation'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MAX_NUM, MAX_TEXT_LENGTH } from '@/convex/constants'
import { ProcessedImageResult } from '@/services/gcp/cloud_storage/types'
import Uploader from '@/components/common/Uploader'
import { createSingleImageFormData, uploadImages } from '@/lib/utils'

// 施術時間：0〜360分の5分刻みをキャッシュ
// 0分を許容する事で物販にも対応する
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
    unit_price: z.preprocess(
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
        .max(MAX_NUM, { message: `価格は${MAX_NUM}円以下で入力してください` })
    ), // 価格
    sale_price: zNumberFieldOptional(MAX_NUM, `セール価格は${MAX_NUM}円以下で入力してください`), // セール価格
    order_limit: z.preprocess(
      (val) => {
        // 空文字列の場合はnullを返す
        if (val === '' || val === null || val === undefined) return undefined
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
    in_stock: z.preprocess(
      (val) => {
        // 空文字列の場合はnullを返す
        if (val === '' || val === null || val === undefined) return undefined
        // 数値に変換できない場合は1を返す
        const num = Number(val)
        return isNaN(num) ? 1 : num
      },
      z.number().max(1000, { message: '在庫数は1000以下で入力してください' }).optional()
    ),
    duration_min: z
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
    is_archive: z.boolean({ message: '有効/無効フラグは必須です' }), // 有効/無効フラグ
    images: z.array(
      z.object({
        original_url: z.string(),
        thumbnail_url: z.string(),
      })
    ),
  })
  .refine(
    (data) => {
      // salePriceが存在する場合のみ、priceとの比較を行う
      if (data.sale_price && data.unit_price && data.sale_price >= data.unit_price) {
        return false
      }
      return true
    },
    {
      message: 'セール価格は通常価格より低く設定してください',
      path: ['sale_price'], // エラーメッセージをsalePriceフィールドに表示
    }
  )

function OptionAddForm() {
  const { tenantId, orgId } = useTenantAndOrganization()
  const router = useRouter()
  const [currentTags, setCurrentTags] = useState<string[]>([])
  const { showErrorToast } = useErrorHandler()
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

  const isArchive = watch('is_archive')

  const onSubmit = async (data: z.infer<typeof optionSchema>) => {
    // 画像がある場合はアップロード処理を行う
    let newUploadedImageUrls: { original_url: string; thumbnail_url: string }[] = []

    try {
      if (!tenantId || !orgId) {
        toast.error('サロン情報が必要です')
        return
      }

      if (currentFile) {
        try {
          setIsUploading(true)
          const formData = createSingleImageFormData(currentFile!, orgId, 'option', {
            quality: 'medium',
            aspectType: 'square',
          })

          const responseData = await uploadImages(formData)
          if (responseData) {
            newUploadedImageUrls = responseData.map((image) => ({
              original_url: image.originalUrl,
              thumbnail_url: image.thumbnailUrl,
            }))
          } else {
            console.log(responseData)
            // レスポンスの形式が期待と異なる場合
            throw new Error('画像のアップロード形式が正しくありません')
          }
          setIsUploading(false)
        } catch (error) {
          showErrorToast(error)
          setIsUploading(false) // エラー時は uploading を解除
          return
        }
      }

      await addOption({
        tenant_id: tenantId,
        org_id: orgId,
        name: data.name,
        unit_price: data.unit_price, // 価格
        sale_price: data.sale_price ? data.sale_price : undefined, // セール価格
        order_limit: data.order_limit as number, // 注文制限
        in_stock: data.in_stock as number, // 在庫数
        duration_min: Number(data.duration_min), // 時間(分)
        tags: data.tags, // タグ
        description: data.description, // 説明
        images: newUploadedImageUrls.length > 0 ? newUploadedImageUrls : [],
        is_active: data.is_archive, // 有効/無効フラグ
      })
      toast.success('オプションメニューを登録しました')
      router.push('/dashboard/option')
    } catch (error) {
      // メニュー作成に失敗した場合、新しくアップロードした画像を削除
      if (newUploadedImageUrls.length > 0 && currentFile) {
        try {
          await fetch('/api/storage', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              originalUrl: newUploadedImageUrls[0].original_url,
              withThumbnail: true,
            }),
          })
        } catch (deleteErr) {
          console.error('Failed to delete new original image after update failure:', deleteErr)
          showErrorToast(deleteErr)
        }
      }

      if (newUploadedImageUrls.length > 0 && currentFile) {
        try {
          await fetch('/api/storage', {
            method: 'DELETE',
            body: JSON.stringify({
              originalUrl: newUploadedImageUrls[0].original_url,
              withThumbnail: true,
            }),
          })
        } catch (deleteErr) {
          console.error('Failed to delete new thumbnail image after update failure:', deleteErr)
          showErrorToast(deleteErr)
        }
      }
      showErrorToast(error)
    }
  }

  useEffect(() => {
    if (tenantId && orgId) {
      reset({
        name: undefined as string | undefined,
        unit_price: undefined as number | undefined,
        sale_price: undefined as number | undefined,
        order_limit: 1,
        duration_min: undefined as string | undefined,
        in_stock: 1 as number,
        tags: [] as string[],
        description: undefined as string | undefined,
        is_archive: true,
        images: [] as { original_url: string; thumbnail_url: string }[],
      })
      setCurrentTags([])
      setCurrentFile(null)
    }
  }, [tenantId, orgId, reset])

  if (!tenantId || !orgId) {
    return <Loading />
  }

  if (isUploading) {
    return <Uploader />
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
                  <SingleImageDrop
                    currentFile={currentFile}
                    maxSizeMB={5}
                    onFileSelect={(file) => {
                      setCurrentFile(file ?? null)
                    }}
                    className="rounded-md"
                    aspectType="square"
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
                name="order_limit"
                label="最大注文数"
                type="number"
                placeholder="例: 1"
                register={register}
                errors={errors}
                required
                className="border-border focus-within:border-active transition-colors"
              />
              <ZodTextField
                name="in_stock"
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
                name="unit_price"
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
                name="sale_price"
                label="セール価格"
                type="number"
                icon={<ShoppingBag className="text-primary" />}
                placeholder="例: 4000"
                register={register}
                errors={errors}
                className="border-border focus-within:border-active transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
              <div className="w-full">
                <Label className="text-sm flex items-center gap-2 mb-2">
                  <Clock size={16} className="text-primary" />
                  スタッフが稼働する施術時間 <span className="text-destructive ml-1">*</span>
                </Label>
                <Select
                  onValueChange={(value) => {
                    setValue('duration_min', value, { shouldValidate: true })
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
                {errors.duration_min && (
                  <p className="text-destructive text-sm mt-1">{errors.duration_min.message}</p>
                )}
              </div>
            </div>

            <TagInput
              tags={currentTags}
              setTagsAction={setCurrentTags}
              error={errors.tags?.message}
              title="タグ"
              exampleText="例: 期間限定、セール、デートなど"
            />
          </div>
        </div>

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
            id="is_archive"
            checked={isArchive}
            onCheckedChange={() => setValue('is_archive', !isArchive)}
            className="data-[state=checked]:bg-active"
          />
        </div>

        <div className="flex justify-end">
          <Button
            variant="default"
            type="submit"
            disabled={isSubmitting || isUploading || !isDirty}
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

export default memo(OptionAddForm)
