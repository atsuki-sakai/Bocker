'use client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import React from 'react'
import { Controller } from 'react-hook-form'
import { z } from 'zod'
import { api } from '@/convex/_generated/api'
import { useQuery, useMutation } from 'convex/react'
import { useZodForm } from '@/hooks/useZodForm'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
// コンポーネントのインポート
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ExclusionMenu } from '@/components/common'
import { DashboardSection } from '@/components/common'
import { Label } from '@/components/ui/label'
import { Loading } from '@/components/common'
import { ConvexError } from 'convex/values'
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants'
import { ACTIVE_CUSTOMER_TYPE_VALUES } from '@/convex/types'
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
  User,
} from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Switch } from '@/components/ui/switch'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

import type { Id } from '@/convex/_generated/dataModel'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { toast } from 'sonner'
import { ZodTextField } from '@/components/common'
import { MAX_COUPON_UID_LENGTH } from '@/convex/constants'

const couponSchema = z
  .object({
    name: z.string().min(1, 'クーポン名を入力してください'),
    coupon_uid: z
      .string()
      .min(1, 'クーポンUIDを入力してください')
      .max(
        MAX_COUPON_UID_LENGTH,
        `クーポンUIDは${MAX_COUPON_UID_LENGTH}文字以内で入力してください`
      ),
    discount_type: z.enum(['percentage', 'fixed']),
    percentage_discount_value: z.preprocess(
      (val) => {
        if (val === '' || val === null || val === undefined) return null
        const num = Number(val)
        return isNaN(num) ? null : num
      },
      z.number().nullable() // min/maxバリデーションを削除し、superRefineで処理
    ),
    fixed_discount_value: z.preprocess(
      (val) => {
        if (val === '' || val === null || val === undefined) return null
        const num = Number(val)
        return isNaN(num) ? null : num
      },
      z.number().nullable() // min/maxバリデーションを削除し、superRefineで処理
    ),
    is_active: z.boolean(),
    start_date: z.date(),
    end_date: z.date().refine((date) => date > new Date(), {
      message: '終了日は現在より後の日付を選択してください',
    }),
    max_use_count: z.number().min(0, '0以上の値を入力してください'),
    number_of_use: z.number().min(0, '0以上の値を入力してください'),
    selected_menu_ids: z.array(z.string()).optional(),
    active_customer_type: z.enum(ACTIVE_CUSTOMER_TYPE_VALUES),
  })
  .superRefine((data, ctx) => {
    if (data.discount_type === 'percentage') {
      if (data.percentage_discount_value === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '割引率を入力してください',
          path: ['percentage_discount_value'],
        })
      } else {
        if (data.percentage_discount_value <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: '1%以上の値を入力してください',
            path: ['percentage_discount_value'],
          })
        }
        if (data.percentage_discount_value > 100) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: '割引率は100%以下で入力してください',
            path: ['percentage_discount_value'],
          })
        }
      }
    } else if (data.discount_type === 'fixed') {
      if (data.fixed_discount_value === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '割引額を入力してください',
          path: ['fixed_discount_value'],
        })
      } else {
        if (data.fixed_discount_value <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: '1円以上の値を入力してください',
            path: ['fixed_discount_value'],
          })
        }
        if (data.fixed_discount_value > 99999) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: '割引額は99999円以下で入力してください',
            path: ['fixed_discount_value'],
          })
        }
      }
    }
  })

// アニメーション定義
const fadeIn = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
}

interface CouponEditPageProps {
  params: Promise<{ coupon_id: Id<'coupon'> }>
}
// ページコンポーネント
export default function Page({ params }: CouponEditPageProps) {
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
function CouponPreview({
  data,
  selectedMenuIds,
}: {
  data: z.infer<typeof couponSchema>
  selectedMenuIds: Id<'menu'>[]
}) {
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
          <span className="text-sm tracking-wide text-muted-foreground">{data.coupon_uid}</span>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col justify-start items-start gap-3">
            <div className="text-center">
              <Badge
                variant="outline"
                className={`px-3 py-1 text-lg font-bold  ${
                  data.discount_type === 'percentage'
                    ? 'bg-link text-link-foreground'
                    : 'bg-active-foreground text-active'
                }`}
              >
                {data.discount_type === 'percentage'
                  ? `${data.percentage_discount_value || 0}% OFF`
                  : `¥${data.fixed_discount_value || 0} OFF`}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm mt-2">
              <div className="flex items-center gap-1 text-muted-foreground">
                <CalendarFull size={14} />
                <span>開始日:</span>
              </div>
              <div className="text-right">{formatDate(data.start_date)}</div>

              <div className="flex items-center gap-1 text-muted-foreground">
                <CalendarFull size={14} />
                <span>終了日:</span>
              </div>
              <div className="text-right">{formatDate(data.end_date)}</div>

              <div className="flex items-center gap-1 text-muted-foreground">
                <Hash size={14} />
                <span>利用回数:</span>
              </div>
              <div className="text-right ">
                <span className="text-sm">
                  {isNaN(data.number_of_use) ? 0 : data.number_of_use || 0}
                </span>
                <span className="text-xs text-muted-foreground">
                  / {isNaN(data.max_use_count) ? '無制限' : data.max_use_count || '無制限'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted pt-2 pb-2 flex justify-between">
          <div className="text-xs text-muted-foreground">
            クーポン適用外メニュー: {selectedMenuIds.length || 0}件
          </div>
          <Badge
            variant={data.is_active ? 'default' : 'destructive'}
            className={`h-6 ${data.is_active ? 'bg-active-foreground text-active' : 'bg-destructive text-destructive-foreground'}`}
          >
            {data.is_active ? '有効' : '無効'}
          </Badge>
        </CardFooter>
      </Card>
    </div>
  )
}

// メインのフォームコンポーネント
function CouponForm({ couponId }: { couponId: Id<'coupon'> }) {
  const router = useRouter()
  const { tenantId, orgId } = useTenantAndOrganization()
  const { showErrorToast } = useErrorHandler()
  // 状態管理
  const [selectedMenuIds, setSelectedMenuIds] = useState<Id<'menu'>[]>([])
  const [initialSelectedMenuIds, setInitialSelectedMenuIds] = useState<Id<'menu'>[]>([])
  const [isSaving, setIsSaving] = useState(false)
  // Convex
  const upsertCouponExclusionMenu = useMutation(
    api.coupon.exclusion_menu.mutation.upsertExclusionMenu
  )
  const updateCouponRelatedTables = useMutation(api.coupon.mutation.updateCouponRelatedTables)
  const couponCompleteData = useQuery(
    api.coupon.query.getCouponRelatedTablesAndExclusionMenus,
    tenantId && orgId
      ? {
          tenant_id: tenantId,
          org_id: orgId,
          coupon_id: couponId,
        }
      : 'skip'
  )

  const { coupon, couponConfig, exclusionMenus } = couponCompleteData ?? {}
  // フォーム管理
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { isSubmitting, errors, isDirty },
  } = useZodForm(couponSchema, { shouldUnregister: false })

  // フォームの値を監視
  const formValues = watch()
  const discountType = watch('discount_type')

  // フォーム送信ハンドラー
  const onSubmit = async (data: z.infer<typeof couponSchema>) => {
    setIsSaving(true)
    try {
      if (!tenantId || !orgId) {
        toast.error('テナントまたは店舗が存在しません')
        setIsSaving(false)
        return
      }
      if (!couponConfig) {
        throw new ConvexError({
          statusCode: ERROR_STATUS_CODE.NOT_FOUND,
          severity: ERROR_SEVERITY.ERROR,
          callFunc: 'coupon.query.getCouponRelatedTablesAndExclusionMenus',
          message: 'クーポン設定が存在しません',
          title: 'エラー',
          status: 500,
          details: {
            couponId: couponId,
            tenantId: tenantId,
            orgId: orgId,
          },
        })
      }
      await updateCouponRelatedTables({
        tenant_id: tenantId,
        org_id: orgId,
        coupon_id: couponId,
        coupon_uid: data.coupon_uid,
        name: data.name,
        discount_type: data.discount_type,
        percentage_discount_value:
          data.percentage_discount_value === null ? undefined : data.percentage_discount_value,
        fixed_discount_value:
          data.fixed_discount_value === null ? undefined : data.fixed_discount_value,
        is_active: data.is_active,
        start_date_unix: data.start_date.getTime(),
        end_date_unix: data.end_date.getTime(),
        max_use_count: data.max_use_count,
        number_of_use: data.number_of_use,
        active_customer_type: data.active_customer_type,
      })
      await upsertCouponExclusionMenu({
        tenant_id: tenantId,
        org_id: orgId,
        coupon_id: couponId,
        selected_menu_ids: selectedMenuIds,
      })
      toast.success('クーポンを更新しました')
      setTimeout(() => {
        router.push(`/dashboard/coupon`)
      }, 300)
    } catch (e) {
      showErrorToast(e)
      setIsSaving(false)
    }
  }

  // 初期データの設定
  useEffect(() => {
    if (coupon && couponConfig) {
      reset({
        name: coupon.name,
        coupon_uid: coupon.coupon_uid,
        discount_type: (coupon.discount_type as 'percentage' | 'fixed') ?? 'percentage',
        percentage_discount_value: coupon.percentage_discount_value ?? 1,
        fixed_discount_value: coupon.fixed_discount_value ?? 1,
        is_active: coupon.is_active ?? true,
        start_date: new Date(couponConfig.start_date_unix ?? Date.now()),
        end_date: new Date(couponConfig.end_date_unix ?? Date.now()),
        max_use_count: couponConfig.max_use_count ?? 0,
        number_of_use: couponConfig.number_of_use ?? 0,
        active_customer_type: couponConfig.active_customer_type ?? 'all',
      })
    }
    const initialIds = exclusionMenus?.map((menu) => menu.menu_id) ?? []
    setSelectedMenuIds(initialIds)
    setInitialSelectedMenuIds(initialIds)
  }, [reset, coupon, couponConfig, exclusionMenus])

  // 表示用のプレビューデータ
  const previewData = {
    ...formValues,
    selectedMenus: selectedMenuIds,
  }

  // 配列の内容が変更されたか比較
  const menuIdsChanged =
    JSON.stringify(selectedMenuIds.sort()) !== JSON.stringify(initialSelectedMenuIds.sort())

  if (isSaving) return <Loading />
  if (!tenantId || !orgId || coupon === undefined || couponConfig === undefined) {
    return <Loading />
  }

  console.log('errors', errors)
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
                    name="coupon_uid"
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
                          name="discount_type"
                          render={({ field }) => (
                            <Switch
                              checked={field.value === 'fixed'}
                              onCheckedChange={(checked) => {
                                field.onChange(checked ? 'fixed' : 'percentage')
                              }}
                              className="data-[state=checked]:bg-active data-[state=unchecked]:bg-link-foreground"
                            />
                          )}
                        />
                        <div
                          className={`flex-1 text-center text-sm  p-2 rounded-md ${discountType === 'fixed' ? 'bg-active-foreground text-active font-medium' : 'text-muted-foreground'}`}
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
                        name="percentage_discount_value"
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
                        name="fixed_discount_value"
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
                        name="start_date"
                        render={({ field }) => (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={`w-full border-border justify-start text-left font-normal bg-input ${
                                  errors.start_date ? 'border-destructive' : ''
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
                      {errors.start_date && (
                        <motion.p
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          variants={fadeIn}
                          className="mt-1 text-sm text-destructive flex items-center gap-1"
                        >
                          <AlertCircle size={14} />
                          {errors.start_date?.message}
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
                        name="end_date"
                        render={({ field }) => (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={`w-full border-border justify-start text-left font-normal bg-input ${
                                  errors.end_date ? 'border-destructive' : ''
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
                      {errors.end_date && (
                        <motion.p
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          variants={fadeIn}
                          className="mt-1 text-sm text-destructive flex items-center gap-1"
                        >
                          <AlertCircle size={14} />
                          {errors.end_date?.message}
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
                          {isNaN(formValues.number_of_use) ? 0 : formValues.number_of_use || 0}
                        </span>{' '}
                        /
                        <span className="text-sm ml-1 text-muted-foreground">
                          {isNaN(formValues.max_use_count)
                            ? '無制限'
                            : formValues.max_use_count || '無制限'}
                        </span>
                      </p>
                    </div>
                    <ZodTextField
                      register={register}
                      errors={errors}
                      name="max_use_count"
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
                      name="is_active"
                      render={({ field }) => (
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col gap-2">
                            <Label
                              htmlFor="is_active"
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
                              className={`text-xs px-2 py-0.5 rounded-md font-bold ${field.value ? 'bg-active-foreground text-active' : 'bg-destructive text-destructive-foreground'}`}
                            >
                              {field.value ? '有効' : '無効'}
                            </span>
                            <Switch
                              id="is_active"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="data-[state=checked]:bg-active data-[state=unchecked]:bg-destructive-foreground"
                            />
                          </div>
                        </div>
                      )}
                    />
                  </div>
                </div>
                <div className="space-y-4 py-2">
                  <div className="flex flex-col gap-2 pt-2">
                    <Controller
                      control={control}
                      name="active_customer_type"
                      render={({ field }) => (
                        <>
                          <Label className="flex items-center gap-2 text-primary">
                            <User size={14} />
                            <span>対象顧客:</span>
                          </Label>
                          <ToggleGroup
                            type="single"
                            value={field.value}
                            onValueChange={field.onChange}
                            className="flex items-center justify-start w-fit gap-4 bg-muted p-3 rounded-md"
                          >
                            <ToggleGroupItem value="all">全利用者</ToggleGroupItem>
                            <ToggleGroupItem value="first_time">初回利用者</ToggleGroupItem>
                            <ToggleGroupItem value="repeat">リピーター</ToggleGroupItem>
                          </ToggleGroup>
                        </>
                      )}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    クーポンを利用できる対象顧客属性を選択してください。
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="detail">
            <ExclusionMenu
              title="適用しないメニュー"
              selectedMenuIds={selectedMenuIds}
              setSelectedMenuIdsAction={(menuIds: Id<'menu'>[]) => {
                setSelectedMenuIds(menuIds)
                setValue('selected_menu_ids', menuIds, { shouldValidate: true, shouldDirty: true })
              }}
            />
          </TabsContent>
        </Tabs>
        {/* プレビュー部分 */}
        <div className="md:col-span-1">
          <div className="sticky top-4 space-y-4">
            <CouponPreview data={previewData} selectedMenuIds={selectedMenuIds} />

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
