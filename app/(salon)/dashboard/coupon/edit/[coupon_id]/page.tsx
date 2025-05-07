'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import React from 'react';
import { Controller } from 'react-hook-form';
import { z } from 'zod';
import { api } from '@/convex/_generated/api';
import { useQuery, useMutation } from 'convex/react';
import { useZodForm } from '@/hooks/useZodForm';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useSalon } from '@/hooks/useSalon';
// コンポーネントのインポート
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExclusionMenu } from '@/components/common';
import { DashboardSection } from '@/components/common';
import { Label } from '@/components/ui/label';
import { Loading } from '@/components/common';
import {
  CalendarIcon,
  Percent,
  PiggyBank,
  Tag,
  Calendar as CalendarFull,
  Loader2,
  Hash,
  AlertCircle,
  Save,
} from 'lucide-react'

import { Switch } from '@/components/ui/switch'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

import type { Id } from '@/convex/_generated/dataModel'
import { handleErrorToMsg, throwConvexError } from '@/lib/error'
import { toast } from 'sonner'
import { ZodTextField } from '@/components/common'

const couponSchema = z.object({
  name: z.string().min(1, 'クーポン名を入力してください'),
  couponUid: z
    .string()
    .min(1, 'クーポンUIDを入力してください')
    .max(12, 'クーポンUIDは12文字以内で入力してください')
    .optional(),
  discountType: z.enum(['percentage', 'fixed']),
  percentageDiscountValue: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return 0
      const num = Number(val)
      return isNaN(num) ? 0 : num
    },
    z
      .number()
      .min(0, { message: '0以上の値を入力してください' })
      .max(100, { message: '割引率は100%以下で入力してください' })
      .optional()
  ),
  fixedDiscountValue: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return 0
      const num = Number(val)
      return isNaN(num) ? 0 : num
    },
    z
      .number()
      .min(0, { message: '0以上の値を入力してください' })
      .max(99999, { message: '割引額は99999円以下で入力してください' })
      .optional()
  ),
  isActive: z.boolean(),
  startDate: z.date(),
  endDate: z
    .date()
    .refine((date) => date > new Date(), { message: '終了日は現在より後の日付を選択してください' }),
  maxUseCount: z.number().min(0, '0以上の値を入力してください'),
  numberOfUse: z.number().min(0, '0以上の値を入力してください'),
  selectedMenus: z.array(z.string()).optional(),
})

// アニメーション定義
const fadeIn = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
}

interface PageProps {
  params: Promise<{ coupon_id: Id<'coupon'> }>
}
// ページコンポーネント
export default function Page({ params }: PageProps) {
  const unwrappedParams = React.use(params)
  const { coupon_id } = unwrappedParams
  return (
    <DashboardSection
      title="クーポンを編集"
      backLink="/dashboard/coupon"
      backLinkTitle="クーポン一覧へ戻る"
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            クーポン情報を編集して内容を変更できます。
          </p>
          <Separator className="my-2" />
        </div>

        <CouponForm couponId={coupon_id} />
      </div>
    </DashboardSection>
  )
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
        <CardHeader className="pb-2 bg-muted text-primary text-xl">
          <CardTitle className="flex items-center gap-2">
            <Tag size={18} />
            {data.name || 'クーポン名'}
          </CardTitle>
          <span className="text-sm tracking-wide text-muted-foreground">{data.couponUid}</span>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col justify-start items-start gap-3">
            <div className="text-center">
              <Badge
                variant="outline"
                className={`px-3 py-1 text-lg font-bold  ${
                  data.discountType === 'percentage'
                    ? 'bg-link text-link-foreground'
                    : 'bg-active text-active-foreground'
                }`}
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
              <div className="text-right ">
                <span className="text-sm">
                  {isNaN(data.numberOfUse) ? 0 : data.numberOfUse || 0}
                </span>
                <span className="text-xs text-muted-foreground">
                  / {isNaN(data.maxUseCount) ? '無制限' : data.maxUseCount || '無制限'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted pt-2 pb-2 flex justify-between">
          <div className="text-xs text-muted-foreground">
            クーポン適用外メニュー: {data.selectedMenus?.length || 0}件
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
function CouponForm({ couponId }: { couponId: Id<'coupon'> }) {
  const router = useRouter()
  const { salon } = useSalon()
  // 状態管理
  const [selectedMenuIds, setSelectedMenuIds] = useState<Id<'menu'>[]>([])
  const [initialSelectedMenuIds, setInitialSelectedMenuIds] = useState<Id<'menu'>[]>([])
  // Convex
  const updateCouponComplete = useMutation(api.coupon.core.mutation.updateCouponRelatedTables)
  const couponCompleteData = useQuery(
    api.coupon.core.query.findCouponComplete,
    salon?._id
      ? {
          couponId: couponId as Id<'coupon'>,
          salonId: salon?._id as Id<'salon'>,
        }
      : 'skip'
  )

  const { coupon, couponConfig, couponExclusionMenus } = couponCompleteData ?? {}
  // フォーム管理
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { isSubmitting, errors, isDirty },
  } = useZodForm(couponSchema, { shouldUnregister: false })

  // フォームの値を監視
  const formValues = watch()
  const discountType = watch('discountType')

  // フォーム送信ハンドラー
  const onSubmit = async (data: z.infer<typeof couponSchema>) => {
    // 選択されたメニューIDsを追加
    const submitData = {
      ...data,
    }

    try {
      if (!salon) {
        toast.error('サロンが存在しません')
        return
      }
      if (!couponConfig) {
        throw throwConvexError({
          code: 'NOT_FOUND',
          callFunc: 'updateCouponComplete',
          message: 'クーポン設定が存在しません',
          title: 'エラー',
          severity: 'low',
          status: 404,
          details: {
            couponId: couponId,
            salonId: salon._id,
          },
        })
      }
      await updateCouponComplete({
        salonId: salon._id as Id<'salon'>,
        couponId: couponId,
        couponConfigId: couponConfig._id,
        couponUid: submitData.couponUid,
        name: submitData.name,
        discountType: submitData.discountType,
        percentageDiscountValue:
          submitData.percentageDiscountValue !== undefined ? submitData.percentageDiscountValue : 0,
        fixedDiscountValue:
          submitData.fixedDiscountValue !== undefined ? submitData.fixedDiscountValue : 0,
        isActive: submitData.isActive,
        startDate_unix: submitData.startDate.getTime(),
        endDate_unix: submitData.endDate.getTime(),
        maxUseCount: submitData.maxUseCount,
        numberOfUse: submitData.numberOfUse,
        selectedMenuIds: selectedMenuIds,
      })
      toast.success('クーポンを更新しました')
      router.push(`/dashboard/coupon`)
    } catch (e) {
      toast.error(handleErrorToMsg(e))
    }
  }

  // 初期データの設定
  useEffect(() => {
    if (coupon && couponConfig) {
      reset({
        name: coupon.name,
        couponUid: coupon.couponUid,
        discountType: (coupon.discountType as 'percentage' | 'fixed') ?? 'percentage',
        percentageDiscountValue: coupon.percentageDiscountValue ?? 0,
        fixedDiscountValue: coupon.fixedDiscountValue ?? 0,
        isActive: coupon.isActive,
        startDate: new Date(couponConfig.startDate_unix ?? Date.now()),
        endDate: new Date(couponConfig.endDate_unix ?? Date.now()),
        maxUseCount: couponConfig.maxUseCount ?? 0,
        numberOfUse: couponConfig.numberOfUse ?? 0,
      })
    }
    const initialIds = couponExclusionMenus?.map((menu) => menu.menuId) ?? []
    setSelectedMenuIds(initialIds)
    setInitialSelectedMenuIds(initialIds)
  }, [reset, coupon, couponConfig, couponExclusionMenus])

  // 表示用のプレビューデータ
  const previewData = {
    ...formValues,
    selectedMenus: selectedMenuIds,
  }

  // 配列の内容が変更されたか比較
  const menuIdsChanged =
    JSON.stringify(selectedMenuIds.sort()) !== JSON.stringify(initialSelectedMenuIds.sort())

  if (!salon || coupon === undefined || couponConfig === undefined) {
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
        <Tabs defaultValue="preview" className="md:col-span-2">
          <TabsList>
            <TabsTrigger value="preview">基本設定</TabsTrigger>
            <TabsTrigger value="detail">クーポン適用外メニュー設定</TabsTrigger>
          </TabsList>
          <TabsContent value="preview">
            {/* フォーム入力部分 */}
            <div className="md:col-span-3 space-y-6">
              <div className="flex flex-col gap-6 bg-background rounded-lg p-4 shadow-sm border">
                <div className="space-y-4">
                  <ZodTextField
                    register={register}
                    errors={errors}
                    name="name"
                    label="クーポン名"
                    icon={<Tag size={16} />}
                    placeholder="例: 初回限定20%OFF"
                  />
                  <ZodTextField
                    register={register}
                    errors={errors}
                    name="couponUid"
                    label="クーポンコード"
                    icon={<Hash size={16} />}
                    placeholder="例: COUPON-00123"
                  />
                  <span className="text-xs text-muted-foreground">
                    こちらのコードをクーポンコードとして入力する事で割引が適応されます。
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 justify-end items-end">
                    <div className="flex flex-col gap-2 ">
                      <Label className="flex items-center gap-2 text-primary">
                        <Percent size={16} />
                        割引タイプ
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        利用額に対する割引率と固定割引額を選択できます。
                      </span>
                      <div className="flex items-center gap-3 bg-muted p-2 rounded-md">
                        <div
                          className={`flex-1 text-center text-sm p-2 rounded-md ${discountType === 'percentage' ? 'bg-link text-link-foreground font-medium' : 'text-muted-foreground'}`}
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
                          className={`flex-1 text-center text-sm  p-2 rounded-md ${discountType === 'fixed' ? 'bg-active text-active-foreground font-medium' : 'text-muted-foreground'}`}
                        >
                          固定金額
                        </div>
                      </div>
                    </div>

                    {/* 割引額入力（常にマウントして値を保持し、表示だけ切り替える） */}
                    <div className={discountType === 'percentage' ? '' : 'hidden'}>
                      <ZodTextField
                        register={register}
                        errors={errors}
                        name="percentageDiscountValue"
                        label="割引率 (%)"
                        type="number"
                        icon={<Percent size={16} />}
                        placeholder="例: 10"
                      />
                    </div>
                    <div className={discountType === 'fixed' ? '' : 'hidden'}>
                      <ZodTextField
                        register={register}
                        errors={errors}
                        name="fixedDiscountValue"
                        label="固定割引額 (円)"
                        type="number"
                        icon={<PiggyBank size={16} />}
                        placeholder="例: 1000"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 py-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                className={`w-full border-border justify-start text-left font-normal bg-input ${
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
                                className={`w-full border-border justify-start text-left font-normal bg-input ${
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
                  <p className="text-xs text-muted-foreground">
                    クーポンの有効期間は開始日から終了日までになります。
                    <br />
                    期間が過ぎた場合クーポンは自動的に利用できなくなります。
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                    <div className="flex flex-col gap-2">
                      <Label className="flex items-center gap-2 text-primary">現在の利用回数</Label>
                      <p className="text-sm">
                        <span className="text-sm">
                          {isNaN(formValues.numberOfUse) ? 0 : formValues.numberOfUse || 0}
                        </span>{' '}
                        /
                        <span className="text-sm ml-1 text-muted-foreground">
                          {isNaN(formValues.maxUseCount)
                            ? '無制限'
                            : formValues.maxUseCount || '無制限'}
                        </span>
                      </p>
                    </div>
                    <ZodTextField
                      register={register}
                      errors={errors}
                      name="maxUseCount"
                      label="最大利用回数"
                      type="number"
                      icon={<Hash size={16} />}
                      placeholder="例: 100"
                    />
                  </div>
                </div>

                <div className="space-y-4 py-2">
                  <div className="flex flex-col gap-2 pt-2">
                    <Controller
                      control={control}
                      name="isActive"
                      render={({ field }) => (
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col gap-2">
                            <Label
                              htmlFor="isActive"
                              className="flex items-center gap-2 text-primary cursor-pointer"
                            >
                              クーポンの有効/無効
                            </Label>
                            <span className="text-xs text-muted-foreground">
                              無効にするとクーポンは利用できなくなります。
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-md font-bold ${field.value ? 'bg-active text-active-foreground' : 'bg-destructive text-destructive-foreground'}`}
                            >
                              {field.value ? '有効' : '無効'}
                            </span>
                            <Switch
                              id="isActive"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="data-[state=checked]:bg-active"
                            />
                          </div>
                        </div>
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="detail">
            <ExclusionMenu
              title="適用しないメニュー"
              selectedMenuIds={selectedMenuIds}
              setSelectedMenuIdsAction={(menuIds: Id<'menu'>[]) => setSelectedMenuIds(menuIds)}
            />
          </TabsContent>
        </Tabs>
        {/* プレビュー部分 */}
        <div className="md:col-span-1">
          <div className="sticky top-4 space-y-4">
            <CouponPreview data={previewData} />

            <div className="mt-6">
              <Button
                type="submit"
                disabled={isSubmitting || !(isDirty || menuIdsChanged)}
                className="w-full"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    追加中...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    クーポンを更新
                  </>
                )}
              </Button>

              {isDirty && (
                <p className="text-xs text-center mt-2 text-muted-foreground">
                  変更があります。保存を忘れずに。
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}