'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Controller } from 'react-hook-form'
import { useZodForm } from '@/hooks/useZodForm'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useSalon } from '@/hooks/useSalon'
import { handleErrorToMsg } from '@/lib/error'
import { Loading } from '@/components/common'
import { toast } from 'sonner'
// コンポーネントのインポート
import { DashboardSection } from '@/components/common'
import { Label } from '@/components/ui/label'
import {
  CalendarIcon,
  Percent,
  PiggyBank,
  Tag,
  Calendar as CalendarFull,
  Hash,
  AlertCircle,
  Gift,
  Ticket,
  Save,
  Loader2,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ZodTextField } from '@/components/common'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MAX_COUPON_UID_LENGTH } from '@/services/convex/constants'
import { ExclusionMenu } from '@/components/common'
import { Id } from '@/convex/_generated/dataModel'
// スキーマとタイプ定義

const couponSchema = z.object({
  name: z.string().min(1, 'クーポン名を入力してください'),
  couponUid: z
    .string()
    .min(1, '1文字以上の値を入力してください')
    .max(MAX_COUPON_UID_LENGTH, `${MAX_COUPON_UID_LENGTH}文字以内で入力してください`),
  discountType: z.enum(['percentage', 'fixed']),
  percentageDiscountValue: z.preprocess(
    (val) => {
      // 空文字列・NaN は null 扱い
      if (val === '' || val === null || val === undefined) return null
      if (typeof val === 'number' && isNaN(val)) return null // 空の場合はnull扱い
      const num = Number(val)
      return isNaN(num) ? null : num
    },
    z
      .number()
      .min(0, { message: '割引率は0%以上で入力してください' })
      .max(100, { message: '割引率は100%以下で入力してください' })
      .nullable()
      .optional()
  ),
  fixedDiscountValue: z.preprocess(
    (val) => {
      // 空文字列・NaN は null 扱い
      if (val === '' || val === null || val === undefined) return null
      if (typeof val === 'number' && isNaN(val)) return null // 空の場合はnull扱い
      const num = Number(val)
      return isNaN(num) ? null : num
    },
    z
      .number()
      .min(0, { message: '割引額は0円以上で入力してください' })
      .max(99999, { message: '割引額は99999円以下で入力してください' })
      .nullable()
      .optional()
  ),
  isActive: z.boolean(),
  startDate: z.date(),
  endDate: z.date().refine(
    (date) => {
      // 日付の比較時に時刻部分を無視して日付のみで比較
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const compareDate = new Date(date)
      compareDate.setHours(0, 0, 0, 0)

      return compareDate >= today
    },
    { message: '終了日は現在以降の日付を選択してください' }
  ),
  maxUseCount: z
    .number({ required_error: '必須です' })
    .min(0, { message: '0以上の値を入力してください' })
    .max(99999, { message: '99999以下の値を入力してください' })
    .optional(),
  numberOfUse: z
    .number()
    .min(0, '0以上の値を入力してください')
    .max(99999, '99999以下の値を入力してください')
    .optional(),
  selectedMenus: z.array(z.string()).optional(),
})

// アニメーション定義
const fadeIn = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
}

// クーポンプレビューコンポーネント
function CouponPreview({ data }: { data: z.infer<typeof couponSchema> }) {
  const formatDate = (date: Date | undefined) => {
    if (!date) return '未設定'
    try {
      return format(date, 'yyyy/MM/dd', { locale: ja })
    } catch {
      return '無効な日付'
    }
  }

  return (
    <div className="w-full">
      <Card className="shadow-md overflow-hidden">
        <CardHeader className="pb-2 bg-muted">
          <CardTitle className="text-primary flex items-center gap-2 text-xl">
            <Gift size={18} />
            {data.name || 'クーポン名'}
          </CardTitle>
          <span className="text-xs text-muted-foreground">{data.couponUid}</span>
          <CardDescription className="text-muted-foreground">
            {data.isActive ? '有効なクーポン' : '無効なクーポン'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col justify-start items-start gap-3">
            <div className="text-center">
              <Badge
                variant="outline"
                className={`flex-1 text-center p-2 rounded-md text-sm ${data.discountType === 'percentage' ? 'bg-link text-link-foreground font-medium' : 'bg-active text-active-foreground font-medium'}`}
              >
                {data.discountType === 'percentage'
                  ? `${data.percentageDiscountValue || 0}% OFF`
                  : `¥${data.fixedDiscountValue || 0} OFF`}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm mt-2">
              <div className="flex items-center gap-1 text-muted-foreground">
                <CalendarFull size={14} />
                <span>開始日:</span>
              </div>
              <div className="text-right">{formatDate(data.startDate)}</div>

              <div className="flex items-center gap-1 text-muted-foreground">
                <CalendarFull size={14} />
                <span>終了日:</span>
              </div>
              <div className="text-right">{formatDate(data.endDate)}</div>

              <div className="flex items-center gap-1 text-muted-foreground">
                <Hash size={14} />
                <span>利用回数:</span>
              </div>
              <div className="text-right">
                {data.numberOfUse || 0} / {data.maxUseCount || '無制限'}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted pt-2 pb-2 flex justify-between">
          <div className="text-xs text-muted-foreground">
            対象メニュー: {data.selectedMenus?.length || 0}件
          </div>
          <Badge
            variant={data.isActive ? 'default' : 'destructive'}
            className={`h-6 ${data.isActive ? 'bg-active text-active-foreground' : 'bg-destructive text-destructive-foreground'}`}
          >
            {data.isActive ? '有効' : '無効'}
          </Badge>
        </CardFooter>
      </Card>
    </div>
  )
}

// メインのフォームコンポーネント
function CouponForm() {
  const router = useRouter()
  // 状態管理
  const [selectedMenuIds, setSelectedMenuIds] = useState<Id<'menu'>[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { salon } = useSalon()

  const createCouponRelatedTables = useMutation(api.coupon.core.mutation.createCouponRelatedTables)

  // フォーム管理
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useZodForm(couponSchema)

  // フォームの値を監視
  const formValues = watch()
  const discountType = watch('discountType')

  // フォーム送信ハンドラー
  const onSubmit = async (data: z.infer<typeof couponSchema>) => {
    setIsSubmitting(true)

    try {
      if (!salon) {
        toast.error('サロンが見つかりません')
        return
      }
      // 日付をUNIXタイムスタンプに変換（ミリ秒）
      const startDate_unix = data.startDate.getTime()
      const endDate_unix = data.endDate.getTime()

      await createCouponRelatedTables({
        salonId: salon!._id,
        couponUid: data.couponUid,
        name: data.name,
        discountType: data.discountType,
        percentageDiscountValue: data.percentageDiscountValue ?? 0,
        fixedDiscountValue: data.fixedDiscountValue ?? 0,
        isActive: data.isActive,
        startDate_unix,
        endDate_unix,
        maxUseCount: data.maxUseCount ?? 0,
        numberOfUse: 0,
      })

      toast.success('クーポンを作成しました')
      router.push(`/dashboard/coupon`)
    } catch (error) {
      toast.error(handleErrorToMsg(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  // フォームのエラーをデバッグ用に監視
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log('フォームエラー:', errors)
      toast.error('入力内容に誤りがあります。各項目を確認してください。')
    }
  }, [errors])

  // 初期データの設定
  useEffect(() => {
    // 新規作成用の初期値設定
    const today = new Date()
    const oneMonthLater = new Date()
    oneMonthLater.setMonth(today.getMonth() + 1)

    reset({
      name: '',
      couponUid: '',
      discountType: 'percentage',
      percentageDiscountValue: undefined,
      fixedDiscountValue: undefined,
      isActive: true,
      startDate: today,
      endDate: oneMonthLater,
      maxUseCount: 100,
      numberOfUse: 0,
      selectedMenus: [],
    })
  }, [reset])

  // 表示用のプレビューデータ
  const previewData = useMemo(
    () => ({
      ...formValues,
      selectedMenus: selectedMenuIds,
    }),
    [formValues, selectedMenuIds]
  )

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
      className="space-y-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Tabs defaultValue="setting" className="md:col-span-2">
          <TabsList>
            <TabsTrigger value="setting">基本設定</TabsTrigger>
            <TabsTrigger value="exclusion">クーポン適用外メニュー</TabsTrigger>
          </TabsList>
          <TabsContent value="setting">
            <div className=" space-y-8">
              <div className="bg-card rounded-lg p-6 shadow-sm border">
                <div className="flex items-center gap-3 text-xl font-bold text-primary">
                  <div className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full font-bold">
                    1
                  </div>
                  基本情報
                </div>

                <div className="space-y-4 py-3 mt-4">
                  <div>
                    <ZodTextField
                      register={register}
                      errors={errors}
                      name="name"
                      label="クーポン名"
                      icon={<Tag size={16} />}
                      placeholder="例: 初回限定20%OFF"
                    />
                  </div>
                  <div>
                    <ZodTextField
                      register={register}
                      errors={errors}
                      name="couponUid"
                      label="クーポンコード"
                      icon={<Ticket size={16} />}
                      placeholder="例: CODE12345"
                    />
                    <span className="text-xs text-muted-foreground">
                      顧客はこちらのコードを予約時に使用する事で決済からクーポンを利用できます。
                    </span>
                  </div>
                  <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 justify-end items-end">
                    <div className="flex flex-col gap-2">
                      <Label className="flex items-center gap-2 text-muted-foreground">
                        <Percent size={16} />
                        割引タイプ
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        固定割引と利用額に対する割引率を設定できます。
                      </span>
                      <div className="flex items-center gap-3 bg-muted p-3 rounded-md">
                        <div
                          className={`flex-1 text-center p-2 rounded-md text-sm ${discountType === 'percentage' ? 'bg-link text-link-foreground font-medium' : 'text-muted-foreground'}`}
                        >
                          割引率
                        </div>
                        <Controller
                          control={control}
                          name="discountType"
                          render={({ field }) => (
                            <Switch
                              checked={field.value === 'fixed'}
                              onCheckedChange={(checked) => {
                                field.onChange(checked ? 'fixed' : 'percentage')
                              }}
                              className="data-[state=checked]:bg-active data-[state=unchecked]:bg-link"
                            />
                          )}
                        />
                        <div
                          className={`flex-1 text-center p-2 rounded-md text-sm ${discountType === 'fixed' ? 'bg-active text-active-foreground font-medium' : 'text-muted-foreground'}`}
                        >
                          固定金額
                        </div>
                      </div>
                    </div>

                    {discountType === 'percentage' ? (
                      <ZodTextField
                        register={register}
                        errors={errors}
                        name="percentageDiscountValue"
                        label="割引率 (%)"
                        type="number"
                        icon={<Percent size={16} />}
                        placeholder="例: 10"
                      />
                    ) : (
                      <ZodTextField
                        register={register}
                        errors={errors}
                        name="fixedDiscountValue"
                        label="固定割引額 (円)"
                        type="number"
                        icon={<PiggyBank size={16} />}
                        placeholder="例: 1000"
                      />
                    )}
                  </div>
                </div>

                <Separator className="my-10 w-2/3 mx-auto" />

                <div className="flex items-center gap-3 text-xl font-bold text-primary mt-6">
                  <div className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full font-bold">
                    2
                  </div>
                  有効期間と利用回数
                </div>

                <div className="space-y-4 py-2 mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 justify-end items-end">
                    <div className="flex flex-col gap-2">
                      <Label className="flex items-center gap-2 text-primary">
                        <CalendarIcon size={16} />
                        開始日
                      </Label>

                      <Controller
                        control={control}
                        name="startDate"
                        render={({ field }) => (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={`w-full justify-start text-left font-normal border-border bg-input ${
                                  errors.startDate ? 'border-destructive' : ''
                                }`}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? (
                                  format(field.value, 'yyyy年MM月dd日', { locale: ja })
                                ) : (
                                  <span>日付を選択</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                locale={ja}
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        )}
                      />
                      {errors.startDate && (
                        <motion.p
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          variants={fadeIn}
                          className="mt-1 text-sm text-destructive flex items-center gap-1"
                        >
                          <AlertCircle size={14} />
                          {errors.startDate?.message}
                        </motion.p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label className="flex items-center gap-2 text-primary">
                        <CalendarIcon size={16} />
                        終了日
                      </Label>
                      <Controller
                        control={control}
                        name="endDate"
                        render={({ field }) => (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={`w-full justify-start text-left font-normal border-border bg-input ${
                                  errors.endDate ? 'border-destructive' : ''
                                }`}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? (
                                  format(field.value, 'yyyy年MM月dd日', { locale: ja })
                                ) : (
                                  <span>日付を選択</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                locale={ja}
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        )}
                      />
                      {errors.endDate && (
                        <motion.p
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          variants={fadeIn}
                          className="mt-1 text-sm text-destructive flex items-center gap-1"
                        >
                          <AlertCircle size={14} />
                          {errors.endDate?.message}
                        </motion.p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    クーポンの有効期間は開始日から終了日までになります。
                    期間が過ぎた場合クーポンは自動的に利用できなくなります。
                  </span>

                  <ZodTextField
                    register={register}
                    errors={errors}
                    name="maxUseCount"
                    label="最大利用回数"
                    type="number"
                    icon={<Hash size={16} />}
                    placeholder="例: 100"
                  />
                  <span className="text-xs text-muted-foreground">
                    最大利用回数を超えた場合はクーポンは自動的に利用できなくなります。
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xl font-bold text-primary mt-4">
                  <div className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full font-bold">
                    3
                  </div>
                  対象メニューと有効設定
                </div>

                <div className="space-y-4 py-2">
                  <div className="flex flex-col gap-2 pt-2">
                    <Controller
                      control={control}
                      name="isActive"
                      render={({ field }) => (
                        <div className="flex items-center justify-between">
                          <Label
                            htmlFor="isActive"
                            className="flex items-center gap-2 text-primary cursor-pointer"
                          >
                            クーポンを有効/無効にする
                          </Label>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={field.value ? 'default' : 'destructive'}
                              className={`px-2 py-0.5 ${field.value ? 'bg-active text-active-foreground' : 'bg-destructive text-destructive-foreground'}`}
                            >
                              {field.value ? '有効' : '無効'}
                            </Badge>
                            <Switch
                              id="isActive"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </div>
                        </div>
                      )}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    無効にするとクーポンは利用できなくなります。利用を停止したい場合は
                    こちらを選択してください。
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="exclusion">
            <ExclusionMenu
              title="クーポンを利用させないメニュー"
              selectedMenuIds={selectedMenuIds}
              setSelectedMenuIdsAction={setSelectedMenuIds}
            />
          </TabsContent>
        </Tabs>

        {/* プレビュー部分 */}
        <div className="md:col-span-1">
          <div className="sticky top-4 space-y-4">
            <CouponPreview data={previewData} />

            <div className="mt-6">
              <Button type="submit" disabled={isSubmitting} className="w-full " size="lg">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    追加中...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    クーポンを作成
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}

// ページコンポーネント
export default function AddCouponPage() {
  return (
    <DashboardSection
      title="クーポンを作成"
      backLink="/dashboard/coupon"
      backLinkTitle="クーポン一覧へ戻る"
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-500">
            新しいクーポンの情報を入力して作成できます。ステップに沿って入力を進めてください。
          </p>
          <Separator className="my-2" />
        </div>

        <CouponForm />
      </div>
    </DashboardSection>
  );
}
