'use client';

import { MENU_CATEGORY_VALUES, MenuCategory } from '@/services/convex/shared/types/common';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loading, ZodTextField } from '@/components/common';
import { z } from 'zod';
import { useZodForm } from '@/hooks/useZodForm';
import { useSalon } from '@/hooks/useSalon';
import { ImageDrop } from '@/components/common';
import { compressAndConvertToWebP, fileToBase64 } from '@/lib/utils'
import { useAction, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { toast } from 'sonner';
import { handleErrorToMsg } from '@/lib/error';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { TagInput } from '@/components/common';
import { getMinuteMultiples } from '@/lib/schedule';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
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
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import { Gender, Target, MenuPaymentMethod } from '@/services/convex/shared/types/common';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const GenderList = ['unselected', 'male', 'female'] as const
const TargetList = ['all', 'first', 'repeat'] as const
const PaymentMethodList = ['cash', 'credit_card', 'all'] as const
// バリデーションスキーマ
const schemaMenu = z
  .object({
    name: z
      .string()
      .min(1, { message: 'メニュー名は必須です' })
      .max(100, { message: 'メニュー名は100文字以内で入力してください' }),
    category: z
      .enum(MENU_CATEGORY_VALUES, { message: 'カテゴリは必須です' })
      .refine((val) => val !== undefined, { message: 'カテゴリは必須です' }),
    unitPrice: z
      .number()
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
    timeToMin: z.number().refine((val) => val !== 0 && val !== null && val !== undefined, {
      message: '時間は必須です',
    }),
    ensureTimeToMin: z.number().optional(),
    imgFilePath: z.string().max(512).optional(),
    description: z
      .string()
      .min(1, { message: '説明は必須です' })
      .max(1000, { message: '説明は1000文字以内で入力してください' })
      .optional(),
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
  .refine(
    (data) => {
      console.log('data', data)
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
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [targetType, setTargetType] = useState<Target>('all')
  const [targetGender, setTargetGender] = useState<Gender>('unselected')
  const [paymentMethod, setPaymentMethod] = useState<MenuPaymentMethod>('cash')
  const [currentTags, setCurrentTags] = useState<string[]>([])

  const uploadImage = useAction(api.storage.action.upload)
  const deleteImage = useAction(api.storage.action.kill)
  const createMenu = useMutation(api.menu.core.mutation.create)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { isSubmitting, errors },
  } = useZodForm(schemaMenu)

  // 支払い方法の選択ロジック
  const handlePaymentMethod = (method: MenuPaymentMethod) => {
    setPaymentMethod(method)
    setValue('paymentMethod', method, { shouldValidate: true })
  }

  // フォーム送信処理
  const onSubmit = async (data: z.infer<typeof schemaMenu>) => {
    let uploadImagePath: string | undefined
    try {
      if (!salon?._id) {
        toast.error('サロン情報が必要です')
        return
      }

      if (currentFile) {
        setIsUploading(true)

        // 画像処理
        const processedFile = await compressAndConvertToWebP(currentFile)
        const base64Data = await fileToBase64(processedFile)
        const filePath = `${Date.now()}-${processedFile.name}`

        // 画像アップロード
        const uploadResult = await uploadImage({
          directory: 'menu',
          base64Data,
          filePath,
          contentType: processedFile.type,
        })
        uploadImagePath = uploadResult?.publicUrl
      }

      // APIに送信するデータを作成
      const createData = {
        name: data.name,
        category: data.category,
        unitPrice: data.unitPrice,
        timeToMin: data.timeToMin,
        ensureTimeToMin: data.ensureTimeToMin,
        description: data.description,
        targetGender: data.targetGender,
        targetType: data.targetType,
        tags: data.tags,
        paymentMethod: data.paymentMethod,
        isActive: data.isActive,
        imgPath: uploadImagePath || '',
        salePrice: data.salePrice || undefined,
      }

      await createMenu({
        ...createData,
        salonId: salon._id,
      })

      toast.success('メニューを登録しました')
      router.push('/dashboard/menu')
    } catch (error) {
      if (uploadImagePath) {
        await deleteImage({
          imgUrl: uploadImagePath,
        })
      }
      toast.error(handleErrorToMsg(error))
    } finally {
      setIsUploading(false)
    }
  }

  // 初期化
  useEffect(() => {
    if (salon?._id) {
      reset({
        name: undefined as unknown as string,
        category: undefined as unknown as MenuCategory,
        unitPrice: undefined as unknown as number,
        salePrice: undefined as unknown as number,
        timeToMin: undefined as unknown as number,
        ensureTimeToMin: undefined as unknown as number,
        imgFilePath: undefined as unknown as string,
        description: undefined as unknown as string,
        targetGender: 'unselected',
        targetType: 'all',
        tags: [] as string[],
        paymentMethod: 'cash',
        isActive: true,
      })
      setCurrentTags([])
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
            <Card className="border border-dashed h-full flex flex-col">
              <CardHeader className="pb-0">
                <CardTitle className="text-base flex items-center gap-2 mb-2">
                  <ImageIcon size={18} className="text-muted-foreground" />
                  メニュー画像
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow flex items-center justify-center">
                <div className="w-full">
                  <ImageDrop
                    maxSizeMB={5}
                    onFileSelect={(file) => {
                      setCurrentFile(file)
                      setValue('imgFilePath', file.name, { shouldValidate: true })
                    }}
                    className="rounded-md"
                  />
                </div>
              </CardContent>
            </Card>
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
                <Select
                  value={watch('category')}
                  onValueChange={(value) => {
                    setValue('category', value as MenuCategory, { shouldValidate: true })
                  }}
                >
                  <SelectTrigger className="transition-colors">
                    <SelectValue placeholder="メニューのカテゴリを選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {MENU_CATEGORY_VALUES.map((category, index) => (
                      <SelectItem key={index} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">
                  カテゴリがない場合は
                  <a href="mailto:bocker.help@gmail.com" className="text-link-foreground underline">
                    こちら
                  </a>
                  から追加申請いただけます。
                </span>
                {errors.category && <ErrorMessage message={errors.category.message} />}
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
                  実際にスタッフが稼働する施術時間 <span className="text-destructive ml-1">*</span>
                </Label>
                <Select
                  onValueChange={(value) => {
                    setValue('timeToMin', parseInt(value), { shouldValidate: true })
                  }}
                >
                  <SelectTrigger className="transition-colors">
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
                <span className="text-xs text-muted-foreground">
                  スタッフが手を動かして施術に集中している正味の作業時間を指します。
                </span>
                {errors.timeToMin && <ErrorMessage message={errors.timeToMin.message} />}
              </div>
              <div className="max-w-full">
                <Label className="text-sm flex items-center gap-2">
                  <Clock size={16} className="text-muted-foreground" />
                  待機時間を含めたトータルの施術時間
                </Label>
                <Select
                  onValueChange={(value) => {
                    setValue('ensureTimeToMin', parseInt(value), { shouldValidate: true })
                  }}
                >
                  <SelectTrigger className="transition-colors">
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
                <span className="text-xs text-muted-foreground">
                  施術席を専有する必要はあるものの、スタッフが別の作業に移れる待機時間を指します。
                </span>
                {errors.ensureTimeToMin && (
                  <ErrorMessage message={errors.ensureTimeToMin.message} />
                )}
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
