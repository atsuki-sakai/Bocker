'use client';

import { MENU_CATEGORY_VALUES, MenuCategory } from '@/convex/shared/types/common'
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loading, ZodTextField } from '@/components/common';
import { z } from 'zod';
import { useZodForm } from '@/hooks/useZodForm';
import { useSalon } from '@/hooks/useSalon';
import { ImageDrop } from '@/components/common';
import { fileToBase64 } from '@/lib/utils'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { toast } from 'sonner'
import { handleErrorToMsg } from '@/lib/error'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { TagInput } from '@/components/common'
import { getMinuteMultiples } from '@/lib/schedule'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
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
  Loader2,
  X,
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { motion } from 'framer-motion'
import { Gender, Target, MenuPaymentMethod } from '@/convex/shared/types/common'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import { Check, ChevronDown } from 'lucide-react'
import { ProcessedImageResult } from '@/services/image/image.types'

const GenderList = ['unselected', 'male', 'female'] as const
const TargetList = ['all', 'first', 'repeat'] as const
const PaymentMethodList = ['cash', 'credit_card', 'all'] as const
// バリデーションスキーマ
const schemaMenu = z
  .object({
    name: z
      .string({
        required_error: 'メニュー名は必須です',
        invalid_type_error: 'メニュー名は文字列で入力してください',
      })
      .min(1, { message: 'メニュー名は必須です' })
      .max(100, { message: 'メニュー名は100文字以内で入力してください' }),
    categories: z.array(z.enum(MENU_CATEGORY_VALUES)).min(1, { message: 'カテゴリは必須です' }),
    unitPrice: z
      .number({
        required_error: '価格は必須です',
        invalid_type_error: '価格は数値で入力してください',
      })
      .min(1, { message: '価格は必須です' })
      .max(99999, { message: '価格は99999円以下で入力してください' })
      .nullable()
      .optional()
      .refine((val) => val !== null, { message: '価格は必須です' }),
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
      .number({
        required_error: '時間は必須です',
      })
      .refine((val) => val !== 0 && val !== null && val !== undefined, {
        message: '時間は必須です',
      }),
    imgPaths: z.array(z.string()).optional(),
    thumbnailPaths: z.array(z.string()).optional(),
    description: z
      .string({
        required_error: '説明は必須です',
        invalid_type_error: '説明は文字列で入力してください',
      })
      .min(1, { message: '説明は必須です' })
      .max(1000, { message: '説明は1000文字以内で入力してください' }),
    targetGender: z.enum(GenderList, { message: '性別は必須です' }),
    targetType: z.enum(TargetList, { message: '対象タイプは必須です' }),
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
    ),
    paymentMethod: z.enum(PaymentMethodList, {
      message: '支払い方法は必須です',
    }),
    isActive: z.boolean({ message: '有効/無効フラグは必須です' }),
  })
  .refine(
    (data) => {
      // salePriceが存在する場合のみ、unitPriceとの比較を行う
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
    className="text-destructive text-sm mt-1 flex items-center gap-1"
    initial={{ opacity: 0, height: 0 }}
    animate={{ opacity: 1, height: 'auto' }}
    exit={{ opacity: 0, height: 0 }}
  >
    <AlertCircle size={14} /> {message ?? 'NULL'}
  </motion.p>
)

export default function MenuAddForm() {
  const router = useRouter()
  const { salon } = useSalon()
  const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = useState(false)
  const [currentFiles, setCurrentFiles] = useState<File[]>([])

  const [isUploading, setIsUploading] = useState(false)
  const [targetType, setTargetType] = useState<Target>('all')
  const [targetGender, setTargetGender] = useState<Gender>('unselected')
  const [paymentMethod, setPaymentMethod] = useState<MenuPaymentMethod>('cash')
  const [currentTags, setCurrentTags] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const createMenu = useMutation(api.menu.core.mutation.create)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useZodForm(schemaMenu)

  // 支払い方法の選択ロジック
  const handlePaymentMethod = (method: MenuPaymentMethod) => {
    setPaymentMethod(method)
    setValue('paymentMethod', method, { shouldValidate: true })
  }

  // フォーム送信処理
  const onSubmit = async (data: z.infer<typeof schemaMenu>) => {
    try {
      if (!salon?._id) {
        toast.error('サロン情報が必要です')
        return
      }

      setIsSubmitting(true)
      let newUploadedImageUrls: ProcessedImageResult[] = []

      if (currentFiles.length > 0) {
        setIsUploading(true)
        try {
          const imagePayloads = await Promise.all(
            currentFiles.map(async (file) => {
              const originalBase64 = await fileToBase64(file)
              return {
                base64Data: originalBase64,
                fileName: file.name,
                directory: 'menu' as const, // CompressCompressCompressCompressCompressCompressCompressImageService側で salonId が結合されることを期待
                salonId: salon._id,
                quality: 'high',
              }
            })
          )

          const response = await fetch('/api/storage', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(imagePayloads),
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || '画像のアップロードに失敗しました')
          }

          const responseData: { successfulUploads?: ProcessedImageResult[] } = await response.json()
          if (responseData.successfulUploads) {
            newUploadedImageUrls = responseData.successfulUploads
          } else {
            // レスポンスの形式が期待と異なる場合
            throw new Error('画像のアップロード結果の形式が正しくありません。')
          }

          setIsUploading(false)
        } catch (err) {
          // APIへのリクエスト失敗時や、API側でロールバックが発生した場合
          // newUploadedImageUrls には何も入っていないか、APIがロールバックしているのでここでは削除処理は不要

          setIsUploading(false)
          setIsSubmitting(false)
          toast.error(
            err instanceof Error
              ? err.message
              : handleErrorToMsg(err) || '画像のアップロードに失敗しました'
          )
          return
        }
      }

      try {
        const images = newUploadedImageUrls.map((urlPair) => ({
          imgPath: urlPair.imgUrl,
          thumbnailPath: urlPair.thumbnailUrl,
        }))

        const menuId = await createMenu({
          salonId: salon._id,
          name: data.name,
          categories: data.categories,
          unitPrice: data.unitPrice,
          salePrice: (data.salePrice as number) || undefined,
          timeToMin: data.timeToMin,
          images: images.length > 0 ? images : undefined,
          description: data.description,
          targetGender: data.targetGender,
          targetType: data.targetType,
          tags: data.tags,
          paymentMethod: data.paymentMethod,
          isActive: data.isActive,
        })

        toast.success('メニューを登録しました')
        router.push(`/dashboard/menu/${menuId}`)
      } catch (err) {
        // メニュー作成に失敗した場合、アップロードした画像を削除
        // newUploadedImageUrlsを使って削除処理を行う (API側でロールバックされていなければ)
        // ただし、API側でロールバックが行われているはずなので、ここでの削除は二重処理になる可能性がある
        // そのため、エラー発生時の画像削除ロジックを再検討するか、API側でのロールバックに依存する。
        // 現状は、API側のロールバックに任せ、クライアント側ではStateのクリアのみ行う。

        setIsSubmitting(false)
        toast.error(handleErrorToMsg(err) || 'メニュー登録に失敗しました')
      }
    } catch (err) {
      setIsSubmitting(false)
      toast.error(handleErrorToMsg(err) || 'メニュー登録に失敗しました')
    }
  }

  // 初期化
  useEffect(() => {
    if (salon?._id) {
      reset({
        name: undefined as unknown as string,
        categories: [] as MenuCategory[],
        unitPrice: undefined as unknown as number,
        salePrice: undefined as unknown as number,
        timeToMin: undefined as unknown as number,
        // imgFilePath は削除したので不要
        description: undefined as unknown as string,
        targetGender: 'unselected',
        targetType: 'all',
        tags: [] as string[],
        paymentMethod: 'cash',
        isActive: true,
      })
      setCurrentTags([])
      setCurrentFiles([]) // currentFilesも初期化
    }
  }, [salon?._id, reset])

  if (!salon) {
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
            <div className="text-base flex items-center gap-2 mb-2">
              <ImageIcon size={18} className="text-muted-foreground" />
              メニュー画像 (4枚まで)
            </div>
            <ImageDrop
              multiple={true}
              onFileSelect={(newFiles) => {
                setCurrentFiles(newFiles)
              }}
            />
          </div>

          <div className="md:col-span-2 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <ZodTextField
                name="name"
                label="メニュー名"
                icon={<Tag className="text-gray-500" />}
                placeholder="メニュー名を入力してください"
                register={register}
                errors={errors}
                required
                className="border-link-foreground focus-within:border-link-foreground transition-colors"
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
                      onClick={() => setIsCategoryPopoverOpen(true)}
                      className="w-full h-fit justify-between border border-border"
                    >
                      <p className="text-wrap w-full">
                        {watch('categories') && watch('categories').length > 0
                          ? watch('categories')
                              .map((cat: string) => cat)
                              .join(', ')
                          : 'メニューのカテゴリを選択してください'}
                      </p>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    onOpenAutoFocus={(event) => event.preventDefault()}
                    onInteractOutside={() => setIsCategoryPopoverOpen(false)}
                    className="w-[300px] p-0"
                  >
                    <Command>
                      <div className="flex items-center justify-between gap-2">
                        <CommandInput className="w-full" placeholder="カテゴリを検索..." />
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
                              const current = watch('categories') || []
                              if (current.includes(category)) {
                                // If the category exists, remove it
                                setValue(
                                  'categories',
                                  current.filter((c: string) => c !== category),
                                  { shouldValidate: true }
                                )
                              } else {
                                // If the category doesn't exist, check if we can add it
                                if (current.length >= 5) {
                                  toast.error('カテゴリは最大5つまでです')
                                  return
                                } else {
                                  setValue('categories', [...current, category], {
                                    shouldValidate: true,
                                  })
                                }
                              }
                            }}
                          >
                            <Check
                              className={
                                (watch('categories') || []).includes(category)
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
                <p className="text-xs text-muted-foreground mt-1">
                  複数のカテゴリを選択した場合、自動的にセットメニューとして扱われます。
                </p>

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
                className="border-link-foreground focus-within:border-link-foreground transition-colors"
              />

              <ZodTextField
                name="salePrice"
                label="セール価格"
                type="number"
                icon={<ShoppingBag className="text-muted-foreground" />}
                placeholder="例: 4000"
                register={register}
                errors={errors}
                className="border-link-foreground focus-within:border-link-foreground transition-colors"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="max-w-full">
                <Label className="text-sm flex items-center gap-2">
                  <Clock size={16} className="text-muted-foreground" />
                  施術時間 <span className="text-destructive ml-1">*</span>
                </Label>
                <Select
                  onValueChange={(value) => {
                    setValue('timeToMin', parseInt(value), { shouldValidate: true })
                  }}
                >
                  <SelectTrigger className="transition-colors">
                    <SelectValue placeholder="施術時間を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {getMinuteMultiples(5, 360).map((time) => (
                      <SelectItem key={time} value={time.toString()}>
                        {time}分
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.timeToMin && <ErrorMessage message={errors.timeToMin.message} />}
                <span className="text-xs text-muted-foreground">
                  メニューのトータルの施術時間を設定します。
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2 text-sm">
                  <Repeat size={16} className="text-muted-foreground" />
                  対象
                </Label>

                <Select
                  value={targetType}
                  onValueChange={(value) => {
                    setTargetType(value as Target)
                    setValue('targetType', value as Target)
                  }}
                >
                  <SelectTrigger className="transition-colors">
                    <SelectValue defaultValue={'all'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全員</SelectItem>
                    <SelectItem value="first">初回</SelectItem>
                    <SelectItem value="repeat">リピート</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">
                  メニューを主に利用する顧客属性を選択できます。
                </span>
              </div>
              <div>
                <Label className="flex items-center gap-2 text-sm">
                  <Users size={16} className="text-muted-foreground" />
                  性別
                </Label>

                <Select
                  value={targetGender}
                  onValueChange={(value) => {
                    setTargetGender(value as Gender)
                    setValue('targetGender', value as Gender)
                  }}
                >
                  <SelectTrigger className="transition-colors">
                    <SelectValue defaultValue={'unselected'} />
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
                <span className="text-xs text-muted-foreground">
                  メニュー対象の性別を選択してください
                </span>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-12 w-1/2 mx-auto" />

        <TagInput
          tags={currentTags}
          setTagsAction={(tags) => {
            setCurrentTags(tags)
            setValue('tags', tags.join('、') as unknown as string[], { shouldValidate: true })
          }}
          error={errors.tags?.message}
          exampleText="例: デジタルパーマ、夏にしたい髪型、面長に合う"
        />

        <Label className="flex items-center gap-2 text-sm mb-3 mt-8">
          <CreditCard size={16} className="text-muted-foreground" />
          支払い方法
        </Label>

        {salon?.stripeConnectStatus === 'active' ? (
          <ToggleGroup
            type="single"
            className="w-full flex flex-wrap justify-start items-center gap-6"
            value={paymentMethod}
            onValueChange={(value) => handlePaymentMethod(value as MenuPaymentMethod)}
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
              オンライン決済を利用する場合は、
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

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-xs  mt-2 flex items-center gap-1 cursor-help w-fit">
                <AlertCircle size={14} />
                オンライン決済には手数料が発生します
              </p>
            </TooltipTrigger>
            <TooltipContent className=" p-3 shadow-lg border  text-xs ">
              <p>オンライン決済手数料: 4% + 40円/件</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Label className="flex items-center gap-2 text-sm mb-2 mt-6">
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
            <p className="text-xs text-muted-foreground mt-2">
              オフにすると、このメニューはお客様に表示されません
            </p>
          </div>
          <Switch
            id="isActive"
            checked={watch('isActive')}
            onCheckedChange={(checked) => setValue('isActive', checked)}
            className="data-[state=checked]:bg-active"
          />
        </div>

        <div className="flex justify-end mt-6">
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/menu')}
              className="min-w-28 border-border"
            >
              戻る
            </Button>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button type="submit" disabled={isSubmitting || isUploading}>
                {isSubmitting || isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    追加中...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    メニューを追加
                  </>
                )}
              </Button>
            </motion.div>
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
