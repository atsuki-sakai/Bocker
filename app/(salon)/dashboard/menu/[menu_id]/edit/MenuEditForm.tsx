'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loading, ZodTextField } from '@/components/common';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Loader2 } from 'lucide-react';
import { MENU_CATEGORY_VALUES } from '@/services/convex/shared/types/common'
import { z } from 'zod'
import { useZodForm } from '@/hooks/useZodForm'
import { useSalon } from '@/hooks/useSalon'
import { ImageDrop } from '@/components/common'
import { TagInput } from '@/components/common'
import { compressAndConvertToWebP, fileToBase64, createImageWithThumbnail } from '@/lib/utils'
import { useAction, useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { toast } from 'sonner'
import { handleErrorToMsg } from '@/lib/error'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { getMinuteMultiples } from '@/lib/schedule'
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
  TARGET_VALUES,
  MENU_PAYMENT_METHOD_VALUES,
  Target,
  Gender,
  MenuPaymentMethod,
} from '@/services/convex/shared/types/common'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import { Check, ChevronDown } from 'lucide-react'

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
    unitPrice: z
      .number()
      .min(1, { message: '価格は必須です' })
      .max(99999, { message: '価格は99999円以下で入力してください' })
      .nullable()
      .optional()
      .refine((val) => val !== null, { message: '価格は必須です' })
      .optional(),
    salePrice: z.preprocess(
      (val) => {
        // 空文字列の場合はnullを返す
        if (val === '' || val === null || val === undefined) return null
        // 数値に変換できない場合もnullを返す
        const num = Number(val)
        return isNaN(num) ? null : num
      },
      z
        .number()
        .max(99999, { message: 'セール価格は99999円以下で入力してください' })
        .nullable()
        .optional()
    ),
    timeToMin: z
      .number()
      .refine((val) => val !== null || val !== undefined || val !== 0, {
        message: '実際にスタッフが稼働する施術時間は必須です',
      })
      .optional(),
    imgFilePath: z.string().max(512, { message: '画像は512文字以内で入力してください' }).optional(),
    imgPath: z.string().max(512).optional(),
    thumbnailPath: z.string().max(512).optional(),
    description: z
      .string()
      .min(1, { message: '説明は必須です' })
      .max(1000, { message: '説明は1000文字以内で入力してください' })
      .optional(),
    targetGender: z.enum(GENDER_VALUES, { message: '性別は必須です' }).optional(),
    targetType: z.enum(TARGET_VALUES, { message: '対象タイプは必須です' }).optional(),
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
        .optional()
    ),
    paymentMethod: z
      .enum(MENU_PAYMENT_METHOD_VALUES, { message: '支払い方法は必須です' })
      .optional(),
    isActive: z.boolean({ message: '有効/無効フラグは必須です' }).optional(),
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
  const { salon } = useSalon()
  const menuData = useQuery(api.menu.core.query.get, { menuId })

  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [existingImageUrl, setExistingImageUrl] = useState<string | undefined>(undefined)
  const [existingThumbnailUrl, setExistingThumbnailUrl] = useState<string | undefined>(undefined)
  const [isUploading, setIsUploading] = useState(false)
  const [targetType, setTargetType] = useState<Target>('all')
  const [targetGender, setTargetGender] = useState<Gender>('unselected')
  const [paymentMethod, setPaymentMethod] = useState<MenuPaymentMethod>('cash')
  const [currentTags, setCurrentTags] = useState<string[]>([])
  const [isInitialized, setIsInitialized] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const uploadImage = useAction(api.storage.action.upload)
  const uploadImageWithThumbnail = useAction(api.storage.action.uploadWithThumbnail)
  const deleteImage = useAction(api.storage.action.kill)
  const deleteImageWithThumbnail = useAction(api.storage.action.killWithThumbnail)
  const updateMenu = useMutation(api.menu.core.mutation.update)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useZodForm(schemaMenu)
  // データ取得後にフォームを初期化
  useEffect(() => {
    if (menuData && !isInitialized) {
      const categoriesValue = menuData.categories || []
      const timeToMinValue = menuData.timeToMin || undefined
      const targetGenderValue = menuData.targetGender || 'unselected'
      const targetTypeValue = menuData.targetType || 'all'
      const paymentMethodValue = menuData.paymentMethod || 'cash'

      // ステート変数を設定
      setExistingImageUrl(menuData.imgPath)
      setExistingThumbnailUrl(menuData.thumbnailPath)
      setCurrentTags(menuData.tags || [])

      setTargetGender(targetGenderValue)
      setTargetType(targetTypeValue)
      setPaymentMethod(paymentMethodValue)

      // フォームを初期化
      reset({
        name: menuData.name || (undefined as unknown as string),
        categories: categoriesValue,
        unitPrice: menuData.unitPrice ?? undefined,
        salePrice: menuData.salePrice ?? undefined,
        timeToMin: timeToMinValue ?? undefined,
        imgFilePath: menuData.imgPath || (undefined as unknown as string),
        description: menuData.description || (undefined as unknown as string),
        targetGender: targetGenderValue,
        targetType: targetTypeValue,
        tags: menuData.tags ?? undefined,
        paymentMethod: paymentMethodValue,
        isActive: menuData.isActive ?? true,
        imgPath: menuData.imgPath || undefined,
        thumbnailPath: menuData.thumbnailPath || undefined,
      })

      // 初期化完了フラグを設定
      setIsInitialized(true)
    }
  }, [menuData, reset, setValue, isInitialized])

  // 画像アップロード処理を更新
  const handleImageUpload = async (file: File | null) => {
    if (!file) return

    try {
      setCurrentFile(file)
      setIsUploading(true)

      // クライアント側で画像処理を行う
      const { original, thumbnail } = await createImageWithThumbnail(file)

      // オリジナル画像をアップロード
      const originalBase64 = await fileToBase64(original)
      const originalResult = await uploadImage({
        base64Data: originalBase64,
        filePath: original.name,
        contentType: original.type,
        directory: 'menu',
      })

      // サムネイル画像をアップロード
      const thumbnailBase64 = await fileToBase64(thumbnail)
      const thumbnailResult = await uploadImage({
        base64Data: thumbnailBase64,
        filePath: thumbnail.name,
        contentType: thumbnail.type,
        directory: 'menu',
      })

      // 既存の画像があれば削除
      if (existingImageUrl) {
        await deleteImage({
          imgUrl: existingImageUrl,
        })
      }
      if (existingThumbnailUrl) {
        await deleteImage({
          imgUrl: existingThumbnailUrl,
        })
      }

      // フォームの値を更新
      setValue('imgPath', originalResult.publicUrl)
      setValue('thumbnailPath', thumbnailResult.publicUrl)
      setValue('imgFilePath', file.name)

      setExistingImageUrl(originalResult.publicUrl)
      setExistingThumbnailUrl(thumbnailResult.publicUrl)

      setIsUploading(false)
      toast.success('画像のアップロードに成功しました')
    } catch (err) {
      console.error('Image upload error:', err)
      toast.error(handleErrorToMsg(err) || '画像のアップロードに失敗しました')
      setIsUploading(false)
    }
  }

  // フォーム送信処理
  const onSubmit = async (data: z.infer<typeof schemaMenu>) => {
    try {
      if (!salon?._id) {
        toast.error('サロン情報が必要です')
        return
      }

      setIsSubmitting(true)
      await updateMenu({
        menuId,
        name: data.name,
        categories: data.categories,
        unitPrice: data.unitPrice,
        salePrice: data.salePrice,
        timeToMin: data.timeToMin,
        imgPath: data.imgPath,
        thumbnailPath: data.thumbnailPath,
        description: data.description,
        targetGender: data.targetGender,
        targetType: data.targetType,
        tags: data.tags,
        paymentMethod: data.paymentMethod,
        isActive: data.isActive,
      })

      toast.success('メニューを更新しました')
      router.push(`/dashboard/menu/${menuId}`)
    } catch (err) {
      setIsSubmitting(false)
      toast.error(handleErrorToMsg(err) || 'メニュー更新に失敗しました')
    }
  }

  // 確実に初期値がレンダリングされることを確認
  const renderTargetType = targetType || menuData?.targetType || 'all'
  const renderTargetGender = targetGender || menuData?.targetGender || 'unselected'
  const renderCategories = watch('categories') || menuData?.categories || []
  const renderTimeToMin = watch('timeToMin') || menuData?.timeToMin || undefined

  if (!salon || !menuData) {
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
            <div className="h-full flex flex-col">
              <CardHeader className="pb-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <ImageIcon size={18} className="text-muted-foreground" />
                  メニュー画像
                </CardTitle>
              </CardHeader>

              <ImageDrop
                initialImageUrl={existingImageUrl}
                maxSizeMB={6}
                onFileSelect={(file) => {
                  handleImageUpload(file)
                }}
              />
            </div>
          </div>

          <div className="md:col-span-2 space-y-6">
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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                      {renderCategories && renderCategories.length > 0
                        ? renderCategories.map((cat: string) => cat).join(', ')
                        : 'メニューのカテゴリを選択してください'}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <Command>
                      <CommandInput placeholder="カテゴリを検索..." />
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
                                  current.filter((c: string) => c !== category),
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
                  もしカテゴリがない場合は
                  <a href="mailto:bocker.help@gmail.com" className="text-link underline">
                    こちら
                  </a>
                  から追加申請いただけます。
                </span>
                {errors.categories && <ErrorMessage message={errors.categories.message} />}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ZodTextField
                name="unitPrice"
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
                name="salePrice"
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
                  value={watch('timeToMin')?.toString() ?? renderTimeToMin?.toString()}
                  onValueChange={(value) => {
                    if (!value) {
                      // プレースホルダが選ばれた場合は undefined 扱い
                      setValue('timeToMin', undefined, { shouldValidate: true })
                      return
                    }
                    const n = parseInt(value, 10)
                    if (!Number.isNaN(n)) {
                      setValue('timeToMin', n, { shouldValidate: true })
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
                {errors.timeToMin && <ErrorMessage message={errors.timeToMin.message} />}
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
                  onValueChange={(value: Target) => {
                    if (!value.trim()) return
                    const typedValue = value
                    setTargetType(typedValue)
                    setValue('targetType', typedValue, { shouldValidate: true })
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
                    setValue('targetGender', typedValue, { shouldValidate: true })
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
              setTagsAction={(tags) => {
                setCurrentTags(tags)
                setValue('tags', tags, { shouldValidate: true })
              }}
            />

            <div className="flex flex-col w-full gap-2">
              <Label className="flex items-center gap-2 text-sm mb-3 mt-4">
                <CreditCard size={16} className="text-muted-foreground" />
                支払い方法
              </Label>
              {salon?.stripeConnectStatus === 'active' ? (
                <ToggleGroup
                  type="single"
                  className="w-full flex flex-wrap justify-start items-center gap-6"
                  value={paymentMethod}
                  onValueChange={(value) => {
                    if (value) {
                      const typedValue = value as MenuPaymentMethod
                      setPaymentMethod(typedValue)
                      setValue('paymentMethod', typedValue, { shouldValidate: true })
                    }
                  }}
                >
                  <ToggleGroupItem
                    className="text-sm shadow-sm bg-muted hover:bg-muted-foreground hover:text-active-foreground p-4 data-[state=on]:bg-active data-[state=on]:text-active-foreground"
                    value="cash"
                  >
                    店舗決済のみ
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    className="text-sm shadow-sm bg-muted hover:bg-muted-foreground hover:text-active-foreground p-4 data-[state=on]:bg-active data-[state=on]:text-active-foreground"
                    value="credit_card"
                  >
                    オンライン決済のみ
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    className="text-sm shadow-sm bg-muted hover:bg-muted-foreground hover:text-active-foreground p-4 data-[state=on]:bg-active data-[state=on]:text-active-foreground"
                    value="all"
                  >
                    両方対応
                  </ToggleGroupItem>
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
          onChange={(e) => setValue('description', e.target.value, { shouldValidate: true })}
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
            checked={watch('isActive')}
            onCheckedChange={(checked) => setValue('isActive', checked)} // onCheckedChangeの引数を直接渡す
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
            <Button type="submit" disabled={isSubmitting || isUploading}>
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
      <Accordion type="multiple" className="mt-8 space-y-2">
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
      </Accordion>
    </div>
  )
}
