'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { Loading, ZodTextField, ImageDrop, TagInput } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { handleErrorToMsg } from '@/lib/error'
import { useSalon } from '@/hooks/useSalon'

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
  ImageIcon,
} from 'lucide-react' // Clockを追加
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select' // Select関連を追加
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fileToBase64 } from '@/lib/utils'
import type { ProcessedImageResult } from '@/services/image/image.types'

// APIレスポンスの型定義
type StorageApiResponse = ProcessedImageResult | { error: string }

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
    imgPath: z.string().optional(),
    thumbnailPath: z.string().optional(),
    orderLimit: z
      .number()
      .min(1, { message: '最大注文数は1以上で入力してください' })
      .max(99, { message: '最大注文数は99個以下で入力してください' })
      .nullable()
      .refine((val): val is number => val !== null && val !== undefined, {
        message: '最大注文数は必須です',
      }), // refineを更新
    inStock: z.preprocess(
      (val) => {
        if (val === '' || val === null || val === undefined) return null
        const num = Number(val)
        return isNaN(num) ? null : num
      },
      z
        .number()
        .max(1000, { message: '在庫数は1000個以下で入力してください' })
        .nullable()
        .optional()
    ),
    timeToMin: z // timeToMinのバリデーションを追加
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
  const [currentFiles, setCurrentFile] = useState<File[]>([])
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([])
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
  const isActive = watch('isActive')
  const watchTimeToMin = watch('timeToMin')

  // データ取得後にフォームを初期化
  useEffect(() => {
    if (optionData && !isInitialized) {
      const timeToMinValueString = optionData.timeToMin?.toString() || undefined

      const initialTags = optionData.tags || []

      // 画像関連の状態を設定
      setExistingImageUrls(optionData.imgPath ? [optionData.imgPath] : [])

      // Stateの更新
      setCurrentTags(initialTags)

      // setValueで各フィールドの初期値を設定
      setValue('name', optionData.name || '')
      setValue('unitPrice', optionData.unitPrice ?? 1)
      setValue('salePrice', optionData.salePrice ?? undefined)
      setValue('orderLimit', optionData.orderLimit ?? 1)
      setValue('inStock', optionData.inStock ?? 1)
      setValue('timeToMin', timeToMinValueString)
      setValue('tags', initialTags)
      setValue('description', optionData.description || '')
      setValue('isActive', optionData.isActive ?? true)
      setValue('imgPath', optionData.imgPath || undefined)
      setValue('thumbnailPath', optionData.thumbnailPath || undefined)

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

      setIsSubmitting(true)
      let uploadedOriginalUrl: string | undefined = undefined
      let uploadedThumbnailUrl: string | undefined = undefined
      let hasDeletedOldImages = false

      // 新しい画像がアップロードされた場合
      if (currentFiles && currentFiles.length > 0) {
        try {
          setIsUploading(true)
          const base64Data = await fileToBase64(currentFiles[0])
          const result = await fetch('/api/storage', {
            method: 'POST',
            body: JSON.stringify({
              base64Data,
              fileName: currentFiles[0].name,
              directory: 'option',
              salonId: salon._id,
              quality: 'low',
            }),
          })
          const responseData = (await result.json()) as StorageApiResponse

          if ('error' in responseData) {
            toast.error(responseData.error)
            setIsSubmitting(false) // エラー時は submitting を解除
            setIsUploading(false) // エラー時は uploading を解除
            return
          }
          uploadedOriginalUrl = responseData.imgUrl
          uploadedThumbnailUrl = responseData.thumbnailUrl
        } catch (error) {
          toast.error(handleErrorToMsg(error))
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
          unitPrice: data.unitPrice,
          salePrice: data.salePrice ? Number(data.salePrice) : 0,
          orderLimit: data.orderLimit,
          timeToMin: data.timeToMin ? Number(data.timeToMin) : undefined, // 文字列を数値 or undefined に変換
          inStock: data.inStock ? Number(data.inStock) : undefined,
          tags: data.tags, // zodで変換された配列 or undefined
          description: data.description,
          isActive: data.isActive,
          // 新しい画像がある場合は新しいパス、ない場合は existingImageUrl を維持するか、削除の場合は undefined
          imgPath: uploadedOriginalUrl !== undefined ? uploadedOriginalUrl : data.imgPath,
          thumbnailPath:
            uploadedThumbnailUrl !== undefined ? uploadedThumbnailUrl : data.thumbnailPath,
          optionId, // idは必須
        }

        // 画像を「なし」にする場合 (currentFile がなく、uploadedOriginalUrl もなく、かつ既存の画像パスが存在する場合)
        // または新しい画像に置き換える場合 (uploadedOriginalUrl が存在する)
        // に古い画像を削除
        if (
          (currentFiles.length === 0 && !uploadedOriginalUrl && data.imgPath) || // 画像なしにするケース
          (uploadedOriginalUrl && data.imgPath) // 新しい画像に置き換えるケース
        ) {
          try {
            await fetch('/api/storage', {
              method: 'DELETE',
              body: JSON.stringify({
                imgUrl: data.imgPath,
                withThumbnail: true,
              }),
            })
            hasDeletedOldImages = true
            // データベース更新用に imgPath と thumbnailPath をクリア
            if (currentFiles.length === 0 && !uploadedOriginalUrl) {
              updateData.imgPath = undefined
              updateData.thumbnailPath = undefined
            }
          } catch (deleteError) {
            console.error('Failed to delete old image:', deleteError)
            // 古い画像の削除に失敗しても、オプション更新は試みる
            // 必要に応じてエラーハンドリングを追加
          }
        }

        await updateOption(updateData)

        toast.success('オプションを更新しました')
        router.push('/dashboard/option')
      } catch (updateErr) {
        // メニュー更新に失敗した場合、新しくアップロードした画像を削除
        if (uploadedOriginalUrl && currentFiles.length === 0) {
          try {
            await fetch('/api/storage', {
              method: 'DELETE',
              body: JSON.stringify({
                imgUrl: uploadedOriginalUrl,
                withThumbnail: true,
              }),
            })
            // DBの更新
            updateOption({
              imgPath: '',
              thumbnailPath: '',
              optionId,
            })
          } catch (deleteErr) {
            console.error('Failed to delete new original image after update failure:', deleteErr)
          }
        }

        // 既存の画像を削除していた場合はエラーメッセージを変更
        if (hasDeletedOldImages) {
          toast.error(
            'オプション更新に失敗しました。画像が変更されている場合は、再度ご確認ください。'
          )
        } else {
          toast.error(handleErrorToMsg(updateErr) || 'オプション更新に失敗しました')
        }

        setIsSubmitting(false)
        // throw updateErr // エラーを再スローしない場合、ここで処理を終える
        return // エラー発生時はここで処理を中断
      }
    } catch (error) {
      setIsSubmitting(false)
      toast.error(handleErrorToMsg(error))
    }
  }

  const handleDeleteImage = async (imgUrl: string) => {
    try {
      setIsUploading(true)
      // APIに削除リクエストを送信
      const response = await fetch('/api/storage', {
        method: 'DELETE',
        body: JSON.stringify({ imgUrl, withThumbnail: true }),
      })

      if (!response.ok) {
        // エラーレスポンスを処理
        const errorData = await response.json().catch(() => ({})) // JSONパースエラーも考慮
        toast.error(errorData?.error || '画像の削除に失敗しました')
        return // エラー時はここで処理を終了
      }

      // データベースの画像パスをクリア
      await updateOption({
        imgPath: '',
        thumbnailPath: '',
        optionId,
      })

      toast.success('画像を削除しました')
      setExistingImageUrls([]) // 既存画像のURLをクリア
      setCurrentFile([]) // 選択中のファイルをクリア
      setValue('imgPath', undefined, { shouldDirty: true, shouldValidate: true }) // フォームの画像パスをクリア
      setValue('thumbnailPath', undefined, { shouldDirty: true, shouldValidate: true }) // フォームのサムネイルパスをクリア
      setIsDeleteImageModalOpen(false)
      router.push('/dashboard/option')
    } catch (error) {
      toast.error(handleErrorToMsg(error))
    } finally {
      setIsUploading(false)
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-1">
            <Card className="border border-dashed h-full flex flex-col">
              <CardHeader className="pb-0 flex flex-row mb-3 items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2 mb-2">
                  <ImageIcon size={18} className="text-muted-foreground" />
                  オプションメニュー画像
                </CardTitle>
                {existingImageUrls[0] && (
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault()
                      setIsDeleteImageModalOpen(true)
                    }}
                  >
                    <Trash2 />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="flex-grow flex items-center justify-center">
                <div className="w-full">
                  <ImageDrop
                    initialImageUrls={existingImageUrls}
                    maxSizeMB={5}
                    onFileSelect={(file) => {
                      setCurrentFile(file)
                    }}
                    className="rounded-md"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
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
                  name="orderLimit"
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
                  name="inStock"
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
                  name="unitPrice"
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
                  name="salePrice"
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
                    value={watchTimeToMin?.toString() ?? ''}
                    onValueChange={(value) => {
                      if (!value.trim()) return
                      const numValue = Number(value)
                      setValue('timeToMin', value, { shouldValidate: true, shouldDirty: true })
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
                    メニューの実作業時間を設定します。
                  </span>
                  {errors.timeToMin && <ErrorMessage message={errors.timeToMin.message} />}
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
              setValue('isActive', checked, { shouldValidate: true, shouldDirty: true })
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
              disabled={isSubmitting || isUploading || (!isDirty && currentFiles.length === 0)}
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
          <DialogHeader className="bg-destructive p-4 rounded-t-md mr-2">
            <DialogTitle className="text-destructive-foreground">画像を削除しますか？</DialogTitle>
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
              onClick={() => existingImageUrls[0] && handleDeleteImage(existingImageUrls[0])}
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
