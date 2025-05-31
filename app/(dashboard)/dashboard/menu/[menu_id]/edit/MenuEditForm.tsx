'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loading, ZodTextField } from '@/components/common'
import { Loader2 } from 'lucide-react'
import { MENU_CATEGORY_VALUES } from '@/convex/types'
import { SortableImageGrid } from '@/components/common'
import { z } from 'zod'
import { useZodForm } from '@/hooks/useZodForm'
import { MultiImageDrop, TagInput } from '@/components/common'
import { fileToBase64 } from '@/lib/utils'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import {
  ImageIcon,
  DollarSign,
  Tag,
  Clock,
  Users,
  Repeat,
  CreditCard,
  Wallet,
  ShoppingBag,
  AlertCircle,
  Info,
  Save,
  X,
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { motion } from 'framer-motion'
import { Id } from '@/convex/_generated/dataModel'
import {
  GENDER_VALUES,
  ACTIVE_CUSTOMER_TYPE_VALUES,
  MENU_PAYMENT_METHOD_VALUES,
  Gender,
  MenuPaymentMethod,
  ImageType,
  MenuCategory,
  ActiveCustomerType,
} from '@/convex/types'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command'
import { Check, ChevronDown } from 'lucide-react'
import { getMinuteMultiples } from '@/lib/schedules'
import { MAX_NUM, MAX_NOTES_LENGTH, MAX_TAG_LENGTH } from '@/convex/constants'
import Uploader from '@/components/common/Uploader'

// バリデーションスキーマ
const schemaMenu = z
  .object({
    name: z
      .string()
      .min(1, { message: 'メニュー名は必須です' })
      .max(100, { message: 'メニュー名は100文字以内で入力してください' })
      .optional(),
    categories: z
      .array(z.enum(MENU_CATEGORY_VALUES))
      .min(1, { message: 'カテゴリは必須です' })
      .optional(),
    unit_price: z
      .number()
      .min(1, { message: '価格は必須です' })
      .max(MAX_NUM, { message: `価格は${MAX_NUM}円以下で入力してください` })
      .nullable()
      .optional()
      .refine((val) => val !== null, { message: '価格は必須です' })
      .optional(),
    sale_price: z.preprocess(
      (val) => {
        // 空文字列の場合はundefinedを返す
        if (val === '' || val === null || val === undefined) return undefined
        // 数値に変換できない場合もundefinedを返す
        const num = Number(val)
        return isNaN(num) ? undefined : num
      },
      z
        .number()
        .max(MAX_NUM, { message: `セール価格は${MAX_NUM}円以下で入力してください` })
        .optional()
    ),
    duration_min: z
      .number()
      .refine((val) => val !== null || val !== undefined || val !== 0, {
        message: '実際にスタッフが稼働する施術時間は必須です',
      })
      .optional(),
    images: z
      .array(
        z.object({
          original_url: z.string(),
          thumbnail_url: z.string(),
        })
      )
      .optional(),
    remove_images: z
      .array(
        z.object({
          original_url: z.string(),
          thumbnail_url: z.string(),
        })
      )
      .optional(),
    description: z
      .string()
      .min(1, { message: '説明は必須です' })
      .max(MAX_NOTES_LENGTH, { message: `説明は${MAX_NOTES_LENGTH}文字以内で入力してください` })
      .optional(),
    target_gender: z.enum(GENDER_VALUES, { message: '性別は必須です' }).optional(),
    target_type: z
      .enum(ACTIVE_CUSTOMER_TYPE_VALUES, { message: '対象タイプは必須です' })
      .optional(),
    tags: z.preprocess(
      (val) => (typeof val === 'string' ? val : Array.isArray(val) ? val.join(',') : ''),
      z
        .string()
        .max(MAX_TAG_LENGTH, { message: `タグは${MAX_TAG_LENGTH}文字以内で入力してください` })
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
    payment_method: z
      .enum(MENU_PAYMENT_METHOD_VALUES, { message: '支払い方法は必須です' })
      .optional(),
    is_active: z.boolean({ message: '有効/無効フラグは必須です' }).optional(),
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

export default function MenuEditForm() {
  const router = useRouter()
  const params = useParams()
  const menuId = params.menu_id as Id<'menu'>
  const { orgId, tenantId, subscriptionStatus } = useTenantAndOrganization()
  const menuData = useQuery(api.menu.query.findById, { menu_id: menuId })

  const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = useState(false)
  const { showErrorToast } = useErrorHandler()
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [existingImages, setExistingImages] = useState<ImageType[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [targetType, setTargetType] = useState<ActiveCustomerType>('all')
  const [targetGender, setTargetGender] = useState<Gender>('unselected')
  const [paymentMethod, setPaymentMethod] = useState<MenuPaymentMethod>('cash')
  const [currentTags, setCurrentTags] = useState<string[]>([])
  const [isInitialized, setIsInitialized] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const updateMenu = useMutation(api.menu.mutation.update)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useZodForm(schemaMenu)
  // データ取得後にフォームを初期化
  useEffect(() => {
    if (menuData && !isInitialized) {
      const categoriesValue = menuData.categories || []
      const durationMinValue = menuData.duration_min || undefined
      const targetGenderValue = menuData.target_gender || 'unselected'
      const targetTypeValue = menuData.target_type || 'all'
      const paymentMethodValue = menuData.payment_method || 'cash'

      // ステート変数を設定
      setExistingImages(
        menuData.images?.map((image) => ({
          original_url: image.original_url || '',
          thumbnail_url: image.thumbnail_url || '',
        })) || []
      )
      setCurrentTags(menuData.tags || [])

      setTargetGender(targetGenderValue)
      setTargetType(targetTypeValue)
      setPaymentMethod(paymentMethodValue)

      // フォームを初期化
      reset({
        name: menuData.name,
        categories: categoriesValue,
        unit_price: menuData.unit_price ?? undefined,
        sale_price: menuData.sale_price ?? undefined,
        duration_min: durationMinValue ?? undefined,
        description: menuData.description,
        target_gender: targetGenderValue,
        target_type: targetTypeValue,
        tags: menuData.tags ?? undefined,
        payment_method: paymentMethodValue,
        is_active: menuData.is_active ?? true,
        images: menuData.images,
      })

      // 初期化完了フラグを設定
      setIsInitialized(true)
    }
  }, [menuData, reset, setValue, isInitialized])

  // フォーム送信処理
  const onSubmit = async (data: z.infer<typeof schemaMenu>) => {
    try {
      if (!orgId || !tenantId || !menuData) {
        toast.error('サロン情報または既存メニュー情報が見つかりません')
        return
      }

      setIsSubmitting(true)
      let imagesToSave: ImageType[] = [...existingImages]

      if (newFiles.length > 0 && newFiles[0] !== undefined) {
        setIsUploading(true)
        try {
          const imagePayloads = await Promise.all(
            newFiles.map(async (file) => {
              const originalBase64 = await fileToBase64(file)
              return {
                base64Data: originalBase64,
                fileName: file.name,
                directory: 'menu' as const,
                orgId: orgId,
                quality: 'high',
              }
            })
          )
          console.log('imagePayloads: ', imagePayloads)
          const response = await fetch('/api/storage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(imagePayloads),
          })
          console.log('response: ', response)
          const imageResults = await response.json()
          console.log('imageResults: ', imageResults)
          setIsUploading(false)

          if (imageResults && Array.isArray(imageResults.successfulUploads)) {
            const uploadedImages = imageResults.successfulUploads.map(
              (upload: { originalUrl: string; thumbnailUrl: string }) => ({
                original_url: upload.originalUrl,
                thumbnail_url: upload.thumbnailUrl,
              })
            )
            console.log('--------------------------------')
            console.log('uploadImages: ', uploadedImages)
            console.log('既存画像(existingImages):', existingImages)
            console.log('新規画像(newFiles):', newFiles)
            console.log('アップロード結果(imageResults):', imageResults)
            console.log('アップロードされた画像(uploadedImages):', uploadedImages)
            console.log('保存対象画像(imagesToSave)　前:', imagesToSave)
            imagesToSave = [...existingImages, ...uploadedImages]
            console.log('マージ後 imagesToSave:', imagesToSave)
          } else {
            console.error('画像アップロードのレスポンス形式が不正です:', imageResults)
            toast.error('画像アップロードのレスポンス形式が不正です。')
            setIsSubmitting(false)
            return
          }
        } catch (err) {
          setIsUploading(false)
          setIsSubmitting(false)
          showErrorToast(err)
          return
        }
      }
      const finalImagesToDelete: { original_url: string; thumbnail_url: string }[] = []

      // FIXME: ここでmenuData.imagesに含まれていて、imagesToSaveに含まれていない画像をfinalImagesToDeleteに追加する
      menuData.images?.forEach((initialImage) => {
        // original_urlが存在し、imagesToSave（編集後の画像群）に含まれていなければ削除対象
        if (
          initialImage.original_url &&
          !imagesToSave.some((img) => img.original_url === initialImage.original_url)
        ) {
          finalImagesToDelete.push({
            original_url: initialImage.original_url,
            thumbnail_url: initialImage.thumbnail_url ?? '',
          })
        }
      })

      if (finalImagesToDelete.length > 0) {
        try {
          const removeImages = watch('remove_images') || []
          // APIが期待する形式に合わせてペイロードを構築
          const deleteApiPayload = {
            originalUrls: [
              ...finalImagesToDelete.map((img) => img.original_url),
              ...removeImages.map((img) => img.original_url),
            ], // imgPath の配列を imgUrls に設定
            withThumbnail: true, // すべての画像に対してサムネイルも削除すると仮定
          }
          const deleteResponse = await fetch('/api/storage', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(deleteApiPayload), // 単一のオブジェクトを送信
          })

          if (!deleteResponse.ok) {
            const errorData = {
              message: `ストレージからの画像削除リクエスト失敗 (ステータス: ${deleteResponse.status})`,
              details: {},
            }
            try {
              // レスポンスボディが存在し、JSON形式であればパース試行
              if (deleteResponse.body) {
                const textBody = await deleteResponse.text() // まずテキストとして読み込む
                if (textBody) {
                  // ボディが空でないことを確認
                  errorData.details = JSON.parse(textBody) // その後JSONとしてパース
                } else {
                  errorData.details = { originalResponse: 'empty body' }
                }
              }
            } catch (e) {
              // JSONパースに失敗した場合 (レスポンスがJSONでない、または不正なJSON)
              console.warn('画像削除APIのエラーレスポンスのJSONパースに失敗:', e)
              errorData.details = { originalResponse: 'not a valid JSON or failed to parse' }
            }
            console.error('ストレージからの画像削除に失敗:', errorData)
            toast.error(errorData.message)
          } else {
            // 成功時でもレスポンスボディがあるか確認
            const successData = await deleteResponse.json().catch(() => null)
            if (successData) {
              console.log('画像削除成功レスポンス:', successData)
              toast.info(
                successData.message ||
                  `${finalImagesToDelete.length}件の古い画像をストレージから削除しました。`
              )
            } else {
              toast.info(
                `${finalImagesToDelete.length}件の古い画像をストレージから削除しました。 (レスポンスボディなし)`
              )
            }
          }
        } catch (err: unknown) {
          // catchの型をanyに
          console.error('ストレージからの画像削除中にクライアントサイドエラー:', err)
          toast.error(
            `古い画像の削除中にエラーが発生しました: ${err instanceof Error ? err.message : '不明なエラー'}`
          )
        }
      }

      console.log('updateMenu直前 imagesToSave:', imagesToSave)
      await updateMenu({
        menu_id: menuId,
        name: data.name,
        categories: data.categories,
        unit_price: data.unit_price,
        sale_price: data.sale_price ?? undefined,
        duration_min: data.duration_min,
        images: imagesToSave,
        description: data.description,
        target_gender: data.target_gender,
        target_type: data.target_type,
        tags: data.tags,
        payment_method: data.payment_method,
        is_active: data.is_active,
      })
      toast.success('メニューを更新しました')
      router.push(`/dashboard/menu/${menuId}`)
    } catch (err) {
      setIsSubmitting(false)
      showErrorToast(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 確実に初期値がレンダリングされることを確認
  const renderTargetType = targetType || menuData?.target_type || 'all'
  const renderTargetGender = targetGender || menuData?.target_gender || 'unselected'
  const renderCategories = watch('categories') || menuData?.categories || []
  const renderDurationMin = watch('duration_min') || menuData?.duration_min || undefined

  if (!orgId || !tenantId || !menuData || !isInitialized) {
    return <Loading />
  }

  if (isUploading) {
    return <Uploader uploaded={isUploading} />
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
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
          <div className="md:col-span-2">
            <div className="h-full flex flex-col">
              <CardHeader className="pb-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <ImageIcon size={18} className="text-muted-foreground" />
                  メニュー画像
                </CardTitle>
              </CardHeader>
              <SortableImageGrid
                images={existingImages}
                onChange={(images) => {
                  setExistingImages(images)
                  setValue('images', images, { shouldValidate: true, shouldDirty: true })
                }}
              />
              <MultiImageDrop
                currentFiles={newFiles}
                maxSizeMB={6}
                onFilesSelect={(files: File[]) => {
                  setNewFiles(files)
                }}
                limitFiles={4}
                hasSelected={existingImages.length}
              />
            </div>
          </div>

          <div className="md:col-span-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <ZodTextField
                name="name"
                label="メニュー名"
                icon={<Tag className="text-muted-foreground" />}
                placeholder="メニュー名を入力してください"
                register={register}
                errors={errors}
                required
                className="border-border focus-within:border-border transition-colors"
              />
              <div>
                <div className="text-sm flex items-start gap-2 mb-2">
                  <Label className="text-sm flex items-center gap-2">カテゴリー</Label>
                  <span className="text-destructive">*</span>
                </div>
                <Popover open={isCategoryPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                      onClick={() => setIsCategoryPopoverOpen(true)}
                    >
                      {renderCategories && renderCategories.length > 0
                        ? renderCategories.map((cat: string) => cat).join(', ')
                        : 'メニューのカテゴリを選択してください'}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0 relative">
                    <Command>
                      <div className="absolute top-0 right-0 flex items-center justify-end gap-2 p-2 z-10">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setIsCategoryPopoverOpen(false)
                          }}
                        >
                          <X size={16} />
                        </Button>
                      </div>
                      <CommandEmpty>カテゴリが見つかりません</CommandEmpty>
                      <CommandGroup>
                        {MENU_CATEGORY_VALUES.map((category) => (
                          <CommandItem
                            key={category}
                            onSelect={() => {
                              const current = renderCategories || []
                              if (current.includes(category)) {
                                setValue(
                                  'categories',
                                  current.filter((c: MenuCategory) => c !== category),
                                  { shouldValidate: true }
                                )
                              } else {
                                setValue('categories', [...current, category], {
                                  shouldValidate: true,
                                })
                              }
                            }}
                          >
                            <Check
                              className={
                                (renderCategories || []).includes(category)
                                  ? 'mr-2 h-4 w-4 opacity-100'
                                  : 'mr-2 h-4 w-4 opacity-0'
                              }
                            />
                            {category}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                <span className="text-xs text-muted-foreground">
                  もしご希望のカテゴリがない場合は
                  <a href="mailto:bocker.help@gmail.com" className="text-link-foreground underline">
                    こちら
                  </a>
                  から追加申請をお願いいたします。
                </span>
                {errors.categories && <ErrorMessage message={errors.categories.message} />}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ZodTextField
                name="unit_price"
                label="通常価格"
                icon={<DollarSign className="text-muted-foreground" />}
                type="number"
                placeholder="例: 5000"
                register={register}
                errors={errors}
                required
                className="border-border focus-within:border-border transition-colors"
              />

              <ZodTextField
                name="sale_price"
                label="セール価格"
                type="number"
                icon={<ShoppingBag className="text-muted-foreground" />}
                placeholder="例: 4000"
                register={register}
                errors={errors}
                className="border-border focus-within:border-border transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="max-w-full">
                <Label className="text-sm flex items-center gap-2">
                  <Clock size={16} className="text-muted-foreground" />
                  スタッフが稼働する施術時間 <span className="text-destructive ml-1">*</span>
                </Label>
                <Select
                  value={watch('duration_min')?.toString() ?? renderDurationMin?.toString()}
                  onValueChange={(value) => {
                    if (!value) {
                      setValue('duration_min', undefined, { shouldValidate: true })
                      return
                    }
                    const n = parseInt(value, 10)
                    if (!Number.isNaN(n)) {
                      setValue('duration_min', n, { shouldValidate: true })
                    }
                  }}
                >
                  <SelectTrigger className="border-border focus:border-border transition-colors">
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
                  メニューの実際の稼働時間を入力してください。
                </span>
                {errors.duration_min && <ErrorMessage message={errors.duration_min.message} />}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2 text-sm">
                  <Repeat size={16} className="text-muted-foreground" />
                  対象
                </Label>
                <span className="text-xs text-muted-foreground">
                  メニューを利用できる顧客属性を選択できます。
                </span>
                <Select
                  value={renderTargetType}
                  onValueChange={(value: ActiveCustomerType) => {
                    if (!value.trim()) return
                    const typedValue = value
                    setTargetType(typedValue)
                    setValue('target_type', typedValue, { shouldValidate: true })
                  }}
                >
                  <SelectTrigger className="border-border focus:border-border transition-colors">
                    <SelectValue placeholder="対象を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全員</SelectItem>
                    <SelectItem value="first">初回</SelectItem>
                    <SelectItem value="repeat">リピート</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="flex items-center gap-2 text-sm">
                  <Users size={16} className="text-muted-foreground" />
                  性別
                </Label>
                <span className="text-xs text-muted-foreground">
                  メニュー対象の性別を選択してください
                </span>
                <Select
                  value={renderTargetGender}
                  onValueChange={(value: Gender) => {
                    if (!value.trim()) return
                    const typedValue = value
                    setTargetGender(typedValue)
                    setValue('target_gender', typedValue, { shouldValidate: true })
                  }}
                >
                  <SelectTrigger className="border-border focus:border-border transition-colors">
                    <SelectValue placeholder="性別を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unselected" className="flex items-center gap-2">
                      男性・女性
                    </SelectItem>
                    <SelectItem value="male" className="flex items-center gap-2">
                      男性
                    </SelectItem>
                    <SelectItem value="female" className="flex items-center gap-2">
                      女性
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <TagInput
              tags={currentTags}
              setTagsAction={(tags: string[]) => {
                setCurrentTags(tags)
                setValue('tags', tags, { shouldValidate: true })
              }}
            />

            <div className="flex flex-col w-full gap-2">
              <Label className="flex items-center gap-2 text-sm mb-3 mt-4">
                <CreditCard size={16} className="text-muted-foreground" />
                支払い方法
              </Label>
              {subscriptionStatus === 'active' || subscriptionStatus === 'trialing' ? (
                <ToggleGroup
                  type="single"
                  className="w-full flex flex-wrap justify-start items-center gap-6"
                  value={paymentMethod}
                  onValueChange={(value) => {
                    if (value) {
                      const typedValue = value as MenuPaymentMethod
                      setPaymentMethod(typedValue)
                      setValue('payment_method', typedValue, { shouldValidate: true })
                    }
                  }}
                >
                  <ToggleGroupItem value="cash">店舗決済のみ</ToggleGroupItem>
                  <ToggleGroupItem value="credit_card">オンライン決済のみ</ToggleGroupItem>
                  <ToggleGroupItem value="all">両方対応</ToggleGroupItem>
                </ToggleGroup>
              ) : (
                <div className="bg-warning border border-warning-foreground rounded-md p-4">
                  <p className="text-base font-medium text-warning-foreground mb-2 flex items-center gap-2">
                    <Wallet size={18} />
                    現在は店舗決済のみ利用可能
                  </p>
                  <p className="text-sm text-warning-foreground">
                    オンライン決済を利用する場合には、
                    <Link
                      href="/dashboard/setting"
                      className="text-link-foreground underline font-medium"
                    >
                      決済設定
                    </Link>
                    を完了してください。
                  </p>
                </div>
              )}
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1 cursor-help">
                    <AlertCircle size={14} />
                    オンライン決済には手数料が発生します
                  </p>
                </TooltipTrigger>
                <TooltipContent className="bg-background p-3 shadow-lg border border-border text-muted-foreground text-xs">
                  <p>オンライン決済手数料: 4% + 40円/件</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <Separator className="my-8" />

        <Label className="flex items-center gap-2 text-sm mb-2 mt-4">
          <Info size={16} className="text-muted-foreground" />
          メニュー説明 <span className="text-destructive ml-1">*</span>
        </Label>
        <Textarea
          id="description"
          placeholder="メニューの詳細説明を入力してください"
          {...register('description')}
          onChange={(e) =>
            setValue('description', e.target.value, { shouldValidate: true, shouldDirty: true })
          }
          rows={8}
          className="border-border focus-visible:ring-border resize-none"
        />
        {errors.description && <ErrorMessage message={errors.description?.message} />}

        <div className="flex items-center justify-between p-4 bg-muted rounded-md mb-6 mt-4">
          <div>
            <p className="text-sm font-bold">メニューを公開する</p>
            <p className="mt-1 text-xs text-muted-foreground">
              オフにすると、このメニューはお客様に表示されません
            </p>
          </div>
          <Switch
            id="isActive"
            checked={watch('is_active') ?? true}
            onCheckedChange={(checked) => setValue('is_active', checked ?? true)}
          />
        </div>

        <div className="flex w-full mt-6">
          <div className="flex justify-between w-full gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/menu')}
              className="min-w-28 border-border"
            >
              戻る
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting || isUploading || (!isDirty && newFiles.length === 0)}
            >
              {isSubmitting || isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  追加中...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  メニューを更新
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
      {/* <Accordion type="multiple" className="mt-8 space-y-2">
        <AccordionItem value="line-access-token">
          <AccordionTrigger>
            実際の稼働時間と待機時間を含めたトータルの施術時間の違いについて
          </AccordionTrigger>
          <AccordionContent className="space-y-2 text-sm text-muted-foreground">
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

            <p className="text-xs text-muted-foreground space-y-1">
              * 両時間とも必須入力です。
              <br />* <strong>入力例：</strong> パーマ 90 分（実際の稼働 45 分 ＋ 確保 45
              分）の場合、スタッフは途中 45 分間ほかの顧客を担当できます。
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion> */}
    </div>
  )
}
