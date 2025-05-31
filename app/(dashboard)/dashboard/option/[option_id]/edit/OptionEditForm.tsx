'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { api } from '@/convex/_generated/api'
import { Trash2 } from 'lucide-react'
import { Id } from '@/convex/_generated/dataModel'
import { useZodForm } from '@/hooks/useZodForm'
import { z } from 'zod'
import { Loading, ZodTextField, SingleImageDrop, TagInput } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import Image from 'next/image'
import { getMinuteMultiples } from '@/lib/schedules' // getMinuteMultiplesを追加
import { zNumberFieldOptional } from '@/lib/zod/helpers'
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
import { Card, CardContent } from '@/components/ui/card'
import { fileToBase64 } from '@/lib/utils'
import { ImageType } from '@/convex/types'
import { MAX_NUM } from '@/convex/constants'
import { ProcessedImageResult } from '@/services/gcp/cloud_storage/types'
import Uploader from '@/components/common/Uploader'

// バリデーションスキーマ
const optionSchema = z
  .object({
    name: z
      .string()
      .min(1, { message: 'オプション名は必須です' })
      .max(100, { message: 'オプション名は100文字以内で入力してください' }),
    unit_price: z
      .number()
      .min(1, { message: '単価は必須です' })
      .max(MAX_NUM, { message: `単価は${MAX_NUM}円以下で入力してください` })
      .nullable()
      .optional()
      .refine((val): val is number => val !== null && val !== undefined, {
        message: '単価は必須です',
      }), // refineを更新
    sale_price: zNumberFieldOptional(MAX_NUM, `セール価格は${MAX_NUM}円以下で入力してください`), // セール価格
    images: z.array(
      z.object({
        original_url: z.string().optional(),
        thumbnail_url: z.string().optional(),
      })
    ),
    order_limit: z
      .number()
      .min(1, { message: '最大注文数は1以上で入力してください' })
      .max(99, { message: '最大注文数は99個以下で入力してください' })
      .refine((val): val is number => val !== null && val !== undefined, {
        message: '最大注文数は必須です',
      }), // refineを更新
    in_stock: z.preprocess(
      (val) => {
        if (val === '' || val === null || val === undefined) return undefined
        const num = Number(val)
        return isNaN(num) ? undefined : num
      },
      z
        .number()
        .max(MAX_NUM, { message: `在庫数は${MAX_NUM}個以下で入力してください` })
        .optional()
    ),
    duration_min: z // timeToMinのバリデーションを追加
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
    is_active: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // salePriceが存在し、unitPriceも存在する場合のみ比較
      if (
        data.sale_price !== null &&
        data.sale_price !== undefined &&
        data.unit_price !== null &&
        data.unit_price !== undefined &&
        data.sale_price >= data.unit_price
      ) {
        return false
      }
      return true
    },
    {
      message: 'セール価格は通常価格より低く設定してください',
      path: ['sale_price'],
    }
  )

// エラーメッセージコンポーネント
const ErrorMessage = ({ message }: { message: string | undefined }) => (
  <motion.p
    className="text-destructive text-sm mt-1 flex items-center gap-1"
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
  const optionId = params.option_id as Id<'option'>
  console.log('optionId', optionId)
  const { orgId } = useTenantAndOrganization()
  const optionData = useQuery(api.option.query.findById, { option_id: optionId })
  const updateOption = useMutation(api.option.mutation.update)
  const { showErrorToast } = useErrorHandler()

  const [isInitialized, setIsInitialized] = useState(false)
  const [currentTags, setCurrentTags] = useState<string[]>([])
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [existingImageUrls, setExistingImageUrls] = useState<ImageType[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleteImageModalOpen, setIsDeleteImageModalOpen] = useState(false)
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting: formIsSubmitting, errors, isDirty },
  } = useZodForm(optionSchema)
  const isActive = watch('is_active')
  const durationMin = watch('duration_min')

  // データ取得後にフォームを初期化
  useEffect(() => {
    if (optionData && !isInitialized) {
      const durationMinValueString = optionData.duration_min?.toString() || undefined

      const initialTags = optionData.tags || []

      console.log('optionData', optionData)

      // 画像関連の状態を設定
      setExistingImageUrls(optionData.images)

      // Stateの更新
      setCurrentTags(initialTags)

      // setValueで各フィールドの初期値を設定
      setValue('name', optionData.name || '')
      setValue('unit_price', optionData.unit_price ?? 1)
      setValue('sale_price', optionData.sale_price ?? undefined)
      setValue('order_limit', optionData.order_limit ?? 1)
      setValue('in_stock', optionData.in_stock ?? 1)
      setValue('duration_min', durationMinValueString)
      setValue('tags', initialTags)
      setValue('description', optionData.description || '')
      setValue('is_active', optionData.is_active ?? true)
      setValue('images', optionData.images)

      setIsInitialized(true)
    }
  }, [optionData, setValue, isInitialized])

  // フォーム送信処理
  const onSubmit = async (data: z.infer<typeof optionSchema>) => {
    try {
      if (!orgId || !optionId) {
        toast.error('サロン情報またはオプション情報が見つかりません')
        return
      }

      setIsSubmitting(true)
      let newUploadedImageUrls: { original_url: string; thumbnail_url: string }[] = []
      let hasDeletedOldImages = false

      // 新しい画像がアップロードされた場合
      if (currentFile) {
        try {
          setIsUploading(true)
          const base64Data = await fileToBase64(currentFile)

          const response = await fetch('/api/storage', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              base64Data,
              fileName: currentFile.name,
              directory: 'option',
              orgId: orgId,
              quality: 'medium',
              aspectType: 'square',
            }),
          })

          const responseData: { successfulUploads: ProcessedImageResult[] } = await response.json()
          if (responseData.successfulUploads) {
            newUploadedImageUrls = responseData.successfulUploads.map((item) => ({
              original_url: item.originalUrl,
              thumbnail_url: item.thumbnailUrl,
            }))
          } else {
            // レスポンスの形式が期待と異なる場合
            throw new Error('画像のアップロード結果の形式が正しくありません。')
          }
          setIsUploading(false)
        } catch (error) {
          console.error('Failed to upload image:', error)
          showErrorToast(error)
          setIsSubmitting(false) // エラー時は submitting を解除
          setIsUploading(false) // エラー時は uploading を解除
          return
        } finally {
          setIsUploading(false)
        }
      }

      try {
        // APIに送信するデータを作成
        // zod schemaで型変換後のデータを使用
        const updateData = {
          name: data.name,
          unit_price: data.unit_price,
          sale_price: data.sale_price ? Number(data.sale_price) : 0,
          order_limit: data.order_limit,
          duration_min: data.duration_min ? Number(data.duration_min) : undefined, // 文字列を数値 or undefined に変換
          in_stock: data.in_stock ? Number(data.in_stock) : undefined,
          tags: data.tags, // zodで変換された配列 or undefined
          description: data.description,
          is_active: data.is_active,
          // 新しい画像がある場合は新しいパス、ない場合は existingImageUrl を維持するか、削除の場合は undefined
          images:
            newUploadedImageUrls.length > 0
              ? newUploadedImageUrls
              : existingImageUrls.length > 0 && existingImageUrls[0]?.original_url
                ? [
                    {
                      original_url: existingImageUrls[0].original_url,
                      thumbnail_url: existingImageUrls[0].thumbnail_url,
                    },
                  ]
                : [], // 配列が空なら空配列を渡す
          option_id: optionId, // idは必須
        }

        // 画像を「なし」にする場合 (currentFile がなく、uploadedOriginalUrl もなく、かつ既存の画像パスが存在する場合)
        // または新しい画像に置き換える場合 (uploadedOriginalUrl が存在する)
        // に古い画像を削除
        if (
          (!currentFile &&
            !newUploadedImageUrls.length &&
            existingImageUrls.length > 0 &&
            existingImageUrls[0]?.original_url) || // 画像なしにするケース
          (newUploadedImageUrls.length > 0 &&
            existingImageUrls.length > 0 &&
            existingImageUrls[0]?.original_url) // 新しい画像に置き換えるケース
        ) {
          try {
            await fetch('/api/storage', {
              method: 'DELETE',
              body: JSON.stringify({
                originalUrl: existingImageUrls[0].original_url,
                withThumbnail: true,
              }),
            })
            hasDeletedOldImages = true
            // データベース更新用に images をクリア
            if (!currentFile && !newUploadedImageUrls.length) {
              updateData.images = []
            }
          } catch (deleteError) {
            console.error('Failed to delete old image:', deleteError)
            showErrorToast(deleteError)
            // 古い画像の削除に失敗しても、オプション更新は試みる
            // 必要に応じてエラーハンドリングを追加
          }
        }

        await updateOption({
          ...updateData,
          option_id: optionId,
        })

        toast.success('オプションを更新しました')
        router.push('/dashboard/option')
      } catch (updateErr) {
        // メニュー更新に失敗した場合、新しくアップロードした画像を削除
        if (newUploadedImageUrls.length > 0 && !currentFile) {
          try {
            await fetch('/api/storage', {
              method: 'DELETE',
              body: JSON.stringify({
                originalUrl: existingImageUrls[0].original_url,
                withThumbnail: true,
              }),
            })
            // DBの更新
            updateOption({
              images: [],
              option_id: optionId,
            })
          } catch (deleteErr) {
            console.error('Failed to delete new original image after update failure:', deleteErr)
            showErrorToast(deleteErr)
          }
        }

        // 既存の画像を削除していた場合はエラーメッセージを変更
        if (hasDeletedOldImages) {
          toast.error(
            'オプション更新に失敗しました。画像が変更されている場合は、再度ご確認ください。'
          )
        } else {
          showErrorToast(updateErr)
        }

        setIsSubmitting(false)
        // throw updateErr // エラーを再スローしない場合、ここで処理を終える
        return // エラー発生時はここで処理を中断
      }
    } catch (error) {
      setIsSubmitting(false)
      showErrorToast(error)
    }
  }

  const handleDeleteImage = async (originalUrl: string) => {
    try {
      setIsUploading(true)
      // APIに削除リクエストを送信
      const response = await fetch('/api/storage', {
        method: 'DELETE',
        body: JSON.stringify({ originalUrl: originalUrl, withThumbnail: true }),
      })

      if (!response.ok) {
        // エラーレスポンスを処理
        const errorData = await response.json().catch(() => ({})) // JSONパースエラーも考慮
        toast.error(errorData?.error || '画像の削除に失敗しました')
        return // エラー時はここで処理を終了
      }

      // データベースの画像パスをクリア
      await updateOption({
        images: [],
        option_id: optionId,
      })

      toast.success('画像を削除しました')
      setExistingImageUrls([]) // 既存画像のURLをクリア
      setCurrentFile(null) // 選択中のファイルをクリア
      setValue('images', [], { shouldDirty: true, shouldValidate: true }) // フォームの画像パスをクリア
      setIsDeleteImageModalOpen(false)
      router.push('/dashboard/option')
    } catch (error) {
      showErrorToast(error)
    } finally {
      setIsUploading(false)
    }
  }

  if (!orgId || !optionId || !optionData?._id) {
    return <Loading />
  }

  if (isUploading) {
    return <Uploader />
  }

  console.log('isDirty', isDirty)
  console.log('currentFile', currentFile)
  console.log('errors', errors)

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
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
          <div className="md:col-span-3">
            <Card className="border border-dashed h-full flex flex-col">
              <CardContent className="flex-grow flex items-center justify-center">
                <div className="w-full flex flex-col lg:flex-row lg:gap-4 lg:items-start py-4">
                  {existingImageUrls[0]?.original_url && (
                    <div className="relative w-full lg:w-[50%] max-w-xs flex-shrink-0 mb-2 lg:mb-0">
                      <Image
                        src={existingImageUrls[0].original_url}
                        alt="option image"
                        width={1512}
                        height={1512}
                        className="w-full h-auto object-cover rounded-md border border-border aspect-[1/1]"
                      />
                      <Button
                        className="absolute top-2 right-2 z-10"
                        variant="destructive"
                        size="icon"
                        onClick={(e) => {
                          e.preventDefault()
                          setIsDeleteImageModalOpen(true)
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  )}
                  <div
                    className={`w-full ${existingImageUrls[0]?.original_url ? 'lg:w-[50%]' : ''} flex items-center justify-center`}
                  >
                    <SingleImageDrop
                      maxSizeMB={5}
                      onFileSelect={(file) => {
                        setCurrentFile(file)
                        setValue(
                          'images',
                          file
                            ? [{ original_url: '', thumbnail_url: '' }] // 仮の値
                            : [],
                          { shouldDirty: true }
                        )
                      }}
                      className="rounded-md"
                      aspectType="square"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-3">
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4 w-full">
                <ZodTextField
                  name="name"
                  label="オプション名"
                  icon={<Tag className="text-primary" />}
                  placeholder="オプション名を入力してください"
                  register={register}
                  errors={errors}
                  required
                  className="border-border w-full"
                />

                <ZodTextField
                  name="order_limit"
                  label="最大注文数"
                  icon={<Boxes className="text-primary" />}
                  type="number"
                  placeholder="例: 5"
                  register={register}
                  errors={errors}
                  required
                  className="border-border min-w-[120px]"
                />
                <ZodTextField
                  name="in_stock"
                  label="在庫数"
                  icon={<Boxes className="text-primary" />}
                  type="number"
                  placeholder="例: 5"
                  register={register}
                  errors={errors}
                  required
                  className="border-border min-w-[120px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ZodTextField
                  name="unit_price"
                  label="単価"
                  icon={<DollarSign className="text-primary" />}
                  type="number"
                  placeholder="例: 1000"
                  register={register}
                  errors={errors}
                  required
                  className="border-border w-full"
                />

                <ZodTextField
                  name="sale_price"
                  label="セール価格"
                  type="number"
                  icon={<ShoppingBag className="text-primary" />}
                  placeholder="例: 800"
                  register={register}
                  errors={errors}
                  className="border-border w-full"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="w-full">
                  <Label className="text-sm flex items-center gap-2">
                    <Clock size={16} className="text-primary" />
                    スタッフが稼働する施術時間
                  </Label>

                  <Select
                    value={durationMin?.toString() ?? ''}
                    onValueChange={(value) => {
                      if (!value.trim()) return
                      const numValue = Number(value)
                      setValue('duration_min', value, { shouldValidate: true, shouldDirty: true })
                      console.log('スタッフが稼働する施術時間を選択:', { value, numValue }) // デバッグ用
                    }}
                  >
                    <SelectTrigger className="border-border transition-colors">
                      <SelectValue placeholder="スタッフが稼働する施術時間を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {getMinuteMultiples(5, 360).map((time) => (
                        <SelectItem key={time} value={time.toString()}>
                          {time}分
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">
                    メニューの施術時間を設定します。
                  </span>
                  {errors.duration_min && <ErrorMessage message={errors.duration_min.message} />}
                </div>
              </div>
              <TagInput
                tags={currentTags}
                setTagsAction={(tags) => {
                  setCurrentTags(tags)
                  setValue('tags', tags, { shouldValidate: true, shouldDirty: true })
                }}
              />
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        {/* 説明セクション */}
        <Label className="flex items-center gap-2 text-sm mb-2 mt-4">
          <Info size={16} className="text-primary" />
          オプション説明
        </Label>
        <Textarea
          id="description"
          placeholder="オプションの詳細説明を入力してください（任意）"
          {...register('description')}
          onChange={(e) =>
            setValue('description', e.target.value, { shouldValidate: true, shouldDirty: true })
          }
          rows={10}
          className="border-border"
        />
        {errors.description && <ErrorMessage message={errors.description?.message} />}

        {/* 公開/非公開スイッチ */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-md mb-6 mt-6">
          <div>
            <p className="text-sm font-medium">オプションを公開する</p>
            <p className="text-xs text-muted-foreground mt-1">
              オフにすると、このオプションはお客様に表示されません
            </p>
          </div>
          <Switch
            id="isActive"
            checked={isActive}
            onCheckedChange={(checked) =>
              setValue('is_active', checked, { shouldValidate: true, shouldDirty: true })
            }
            className="data-[state=checked]:bg-active"
          />
        </div>

        <div className="flex justify-end mt-6 w-full">
          <div className="flex justify-between gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/option')}
              className="min-w-28 border-border"
            >
              戻る
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting || isUploading || (!isDirty && !currentFile)}
            >
              {isSubmitting || isUploading || formIsSubmitting ? (
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
          </div>
        </div>
        {errors.root && <ErrorMessage message={errors.root.message} />}
      </form>

      <Dialog open={isDeleteImageModalOpen} onOpenChange={setIsDeleteImageModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">画像を削除しますか？</DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-muted-foreground">
            この操作は元に戻すことができません。
          </DialogDescription>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsDeleteImageModalOpen(false)}>
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                existingImageUrls.length > 0 &&
                existingImageUrls[0]?.original_url &&
                handleDeleteImage(existingImageUrls[0].original_url)
              }
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  削除中...
                </>
              ) : (
                '削除する'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
