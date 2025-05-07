'use client';

import { useState, useEffect, useMemo } from 'react';
import { Separator } from '@/components/ui/separator'
import { Coins, Gift, Loader2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Id } from '@/convex/_generated/dataModel'
import { useZodForm } from '@/hooks/useZodForm'
import { ExclusionMenu } from '@/components/common'
import { z } from 'zod'
import { POINT_EXPIRATION_DAYS } from '@/lib/constants'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Loading } from '@/components/common'
import { useRouter } from 'next/navigation'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { AlertCircle } from 'lucide-react'
import { DollarSign, Percent } from 'lucide-react'
import { ZodTextField } from '@/components/common'
import { Save } from 'lucide-react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { handleErrorToMsg } from '@/lib/error'
import { useSalon } from '@/hooks/useSalon'
import xor from 'lodash-es/xor'

const pointConfigSchema = z.object({
  id: z.string().optional(),
  isFixedPoint: z.boolean().default(false),
  pointRate: z.preprocess(
    (val) => {
      // 空文字列の場合はnullを返す
      if (val === '' || val === null || val === undefined) return null
      // 数値に変換できない場合もnullを返す
      const num = Number(val)
      return isNaN(num) ? null : num
    },
    z
      .number()
      .max(100, { message: 'ポイント付与率は100%以下で入力してください' })
      .nullable()
      .optional()
  ),
  fixedPoint: z.preprocess(
    (val) => {
      // 空文字列の場合はnullを返す
      if (val === '' || val === null || val === undefined) return null
      // 数値に変換できない場合もnullを返す
      const num = Number(val)
      return isNaN(num) ? null : num
    },
    z
      .number()
      .max(99999, { message: '固定ポイントは99999円以下で入力してください' })
      .nullable()
      .optional()
  ),
  pointExpirationDays: z.number().min(1).optional().default(POINT_EXPIRATION_DAYS[0].value),
})

export default function PointTabs() {
  const { salon } = useSalon()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('basic')
  const [selectedMenuIds, setSelectedMenuIds] = useState<Id<'menu'>[]>([])
  const [initialExclusionMenuIds, setInitialExclusionMenuIds] = useState<Id<'menu'>[]>([])

  const pointConfig = useQuery(
    api.point.config.query.findBySalonId,
    salon ? { salonId: salon._id } : 'skip'
  )
  const initialExclusionIds = useQuery(
    api.point.exclusion_menu.query.list,
    pointConfig?._id ? { salonId: salon!._id, pointConfigId: pointConfig._id } : 'skip'
  )
  const upsertExclusionMenu = useMutation(api.point.exclusion_menu.mutation.upsert)
  const upsertPointConfig = useMutation(api.point.config.mutation.upsert)
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { isSubmitting, errors, isDirty },
  } = useZodForm(pointConfigSchema)

  const handleExpirationChange = (value: string) => {
    setValue('pointExpirationDays', parseInt(value), {
      shouldValidate: true,
      shouldDirty: true,
    })
  }

  useEffect(() => {
    if (pointConfig) {
      reset({
        pointRate: pointConfig.pointRate,
        fixedPoint: pointConfig.fixedPoint,
        pointExpirationDays: pointConfig.pointExpirationDays ?? POINT_EXPIRATION_DAYS[0].value,
        isFixedPoint: pointConfig.isFixedPoint,
      })
      if (initialExclusionIds) {
        setInitialExclusionMenuIds(initialExclusionIds)
        setSelectedMenuIds(initialExclusionIds)
      }
    }
  }, [pointConfig, initialExclusionIds, reset])

  const isExclusionDirty = useMemo(() => {
    return xor(initialExclusionMenuIds, selectedMenuIds).length > 0
  }, [initialExclusionMenuIds, selectedMenuIds])

  const onSubmit = async (data: z.infer<typeof pointConfigSchema>) => {
    console.log(data)
    try {
      if (!salon) {
        toast.error('サロンが見つかりません')
        return
      }
      const pointConfigId = await upsertPointConfig({
        salonId: salon._id,
        pointRate: data.pointRate ?? undefined,
        fixedPoint: data.fixedPoint ?? undefined,
        pointExpirationDays: data.pointExpirationDays ?? undefined,
        isFixedPoint: data.isFixedPoint ?? undefined,
      })
      await upsertExclusionMenu({
        salonId: salon._id,
        pointConfigId: pointConfigId as Id<'point_config'>,
        selectedMenuIds: selectedMenuIds,
      })
      toast.success('設定を保存しました')
      router.refresh()
    } catch (error) {
      toast.error(handleErrorToMsg(error))
    }
  }

  if (!salon) {
    return <Loading />
  }
  if (pointConfig === undefined && initialExclusionIds === undefined) {
    return <Loading />
  }

  const watchedExpirationDays = watch('pointExpirationDays')
  const watchedIsFixedPoint = watch('isFixedPoint')

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
          e.preventDefault()
        }
      }}
    >
      <Tabs defaultValue="basic" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="basic" className="flex items-center gap-2">
            <Coins className="h-4 w-4" />
            基本設定
          </TabsTrigger>
          <TabsTrigger value="exclusions" className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            ポイント対象外メニュー
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" key="basic-tab">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5">
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="p-3 bg-muted">
                  <h5 className="flex items-center text-xl font-bold gap-2">
                    <Coins className="h-5 w-5 text-primary" />
                    ポイント基本設定
                  </h5>
                  <p className="text-sm text-muted-foreground py-2 mb-2">
                    サロンを利用した顧客へのポイント付与方法を設定します。
                    <br />
                    ポイントは
                    <span className="font-bold">1ポイント = 1円</span>
                    で付与されます。
                  </p>

                  <span className="text-xs border-warning border bg-warning text-warning-foreground rounded-md p-2">
                    ※ポイントを還元しない場合は0を設定してください。
                  </span>
                </div>

                <div className="space-y-6 p-3 my-3">
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="point-type">ポイント付与タイプ</Label>
                    <span className="text-xs text-muted-foreground">
                      利用額に対してポイント付与するか、固定ポイントを付与するかを選択します。
                    </span>
                    <div
                      className={`flex items-center justify-between p-3 rounded-md ${
                        watchedIsFixedPoint
                          ? 'bg-link text-link-foreground'
                          : 'bg-active-foreground text-active'
                      }`}
                    >
                      <span className="text-sm font-bold">
                        {watchedIsFixedPoint ? '固定ポイント' : 'ポイント付与率'}
                      </span>

                      <Switch
                        id="point-type"
                        checked={watchedIsFixedPoint}
                        onCheckedChange={(checked) => {
                          setValue('isFixedPoint', checked, { shouldDirty: true })
                        }}
                        className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-green-600"
                      />
                    </div>
                  </div>
                  {watchedIsFixedPoint ? (
                    <ZodTextField
                      register={register}
                      errors={errors}
                      name="fixedPoint"
                      label="固定ポイント"
                      type="number"
                      icon={<DollarSign size={16} />}
                      placeholder="例: 100"
                    />
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="pointRate" className="flex items-center gap-2">
                        <Percent size={16} />
                        ポイント付与率 (%)
                      </Label>
                      <Input
                        id="pointRate"
                        type="number"
                        placeholder="例: 5 (5%)"
                        step="1"
                        min="0"
                        max="100"
                        value={watch('pointRate') !== undefined ? watch('pointRate') || 0 : ''}
                        onChange={(e) => {
                          const percentValue = parseFloat(e.target.value)
                          if (!isNaN(percentValue)) {
                            setValue('pointRate', percentValue, {
                              shouldValidate: true,
                              shouldDirty: true,
                            })
                          } else {
                            setValue('pointRate', undefined, {
                              shouldValidate: true,
                              shouldDirty: true,
                            })
                          }
                        }}
                      />
                      {errors.pointRate && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle size={14} />
                          {errors.pointRate.message as string}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="expiration" className=" font-medium">
                      ポイント有効期限
                    </Label>
                    <Select
                      value={
                        watchedExpirationDays !== undefined
                          ? String(watchedExpirationDays)
                          : String(POINT_EXPIRATION_DAYS[0].value)
                      }
                      onValueChange={handleExpirationChange}
                    >
                      <SelectTrigger id="expiration" className="w-full">
                        <SelectValue placeholder="ポイント有効期限（日）" />
                      </SelectTrigger>
                      <SelectContent>
                        {POINT_EXPIRATION_DAYS.map((data) => (
                          <SelectItem key={data.value} value={String(data.value)}>
                            {data.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-slate-500">
                      顧客のポイントはサロンを利用した最終日から
                      {POINT_EXPIRATION_DAYS.find((d) => d.value === watchedExpirationDays)?.label}
                      後に失効します。
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div>
                <div className="h-full shadow-md hover:shadow-lg transition-shadow duration-300 border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-muted p-3">
                    <h5 className="flex items-center text-xl font-bold gap-2">
                      <Gift className="h-5 w-5 text-primary" />
                      ポイント設定概要
                    </h5>
                    <p className="text-sm text-muted-foreground mt-2">
                      現在の設定内容が適用されるとどのように適応されるのかを確認できます。
                    </p>
                  </div>
                  <div className="p-3">
                    <div className="space-y-5">
                      <div className="space-y-2 text-sm">
                        {watchedIsFixedPoint ? (
                          <p className="flex justify-between items-end text-sm font-bold">
                            <span className="text-xs text-primary">固定ポイント:</span>
                            <span className="font-medium">{watch('fixedPoint') || 0} ポイント</span>
                          </p>
                        ) : (
                          <p className="flex justify-between items-end text-sm font-bold">
                            <span className="text-primary">ポイント付与率:</span>
                            <span className="text-base font-bold tracking-wide">
                              {watch('pointRate') || 0}%
                            </span>
                          </p>
                        )}
                        <p className="flex justify-between items-end text-sm font-bold">
                          <span className="text-primary">ポイント有効期限:</span>
                          <span className="text-base font-bold tracking-wide">
                            {POINT_EXPIRATION_DAYS.find((d) => d.value === watchedExpirationDays)
                              ?.label || POINT_EXPIRATION_DAYS[0].label}
                          </span>
                        </p>
                        <p className="text-sm pt-4 w-full text-primary text-end">
                          本日付与された場合、有効期限は{' '}
                          <span className="font-bold">
                            {watchedExpirationDays
                              ? new Date(
                                  Date.now() + watchedExpirationDays * 24 * 60 * 60 * 1000
                                ).toLocaleDateString('ja-JP', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                })
                              : new Date().toLocaleDateString('ja-JP', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                })}
                          </span>
                          です。
                        </p>
                      </div>
                      <Separator className="" />
                      <div className="space-y-4 py-4">
                        <div className=" bg-background  rounded shadow-sm">
                          <p className="text-sm text-muted-foreground">1,000円の決済に対して</p>
                          <p className="text-lg font-bold">
                            {watchedIsFixedPoint
                              ? watch('fixedPoint') || 0
                              : Math.floor((watch('pointRate') || 0) * 10)}{' '}
                            <span className="text-xs">ポイント付与</span>
                          </p>
                        </div>
                        <div className=" bg-background  rounded shadow-sm">
                          <p className="text-sm text-muted-foreground">5,000円の決済に対して</p>
                          <p className="text-lg font-bold">
                            {watchedIsFixedPoint
                              ? watch('fixedPoint') || 0
                              : Math.floor((watch('pointRate') || 0) * 50)}{' '}
                            <span className="text-xs">ポイント付与</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="exclusions" key="exclusions-tab">
          <ExclusionMenu
            title="購入されてもポイントを付与しないメニュー"
            selectedMenuIds={selectedMenuIds}
            setSelectedMenuIdsAction={setSelectedMenuIds}
          />
        </TabsContent>
      </Tabs>
      <div className="flex justify-end mt-4">
        <Button
          type="submit"
          className="px-8 gap-2"
          disabled={isSubmitting || (!isDirty && !isExclusionDirty)}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              追加中...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              設定を保存
            </>
          )}
        </Button>
      </div>
      <Accordion type="single" collapsible className="space-y-2">
        {/* ① 付与の仕組み */}
        <AccordionItem value="point-scheme">
          <AccordionTrigger>ポイント付与の仕組み</AccordionTrigger>
          <AccordionContent className="space-y-2 text-muted-foreground text-sm leading-relaxed bg-muted p-4 rounded-lg mb-4">
            <p>
              <strong>付与日:</strong> 施術が完了した予約をまとめて計算し、
              <span className="font-bold">利用月の翌月15日</span>に自動でポイントを付与します。
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>例：4月来店分 ⇒ 5月15日に付与</li>
            </ul>

            <p className="pt-2">
              <strong>付与方法:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>ポイント付与率: 決済額 × 設定率（%）。小数点以下は切り捨て。</li>
              <li>固定ポイント: 施術メニューに関係なく一律ポイントを付与。</li>
            </ul>

            <p className="pt-2">
              <strong>交換レート:</strong> 1ポイント = 1円相当として会計時に利用できます。
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* ② 失効タイミング */}
        <AccordionItem value="point-expiration">
          <AccordionTrigger>ポイント失効のタイミング</AccordionTrigger>
          <AccordionContent className="space-y-2 text-muted-foreground text-sm leading-relaxed bg-muted p-4 rounded-lg mb-4">
            <p>
              ポイントの有効期限はサロンを利用した最終日から
              <span className="font-bold">
                {POINT_EXPIRATION_DAYS.find((d) => d.value === watchedExpirationDays)?.label}
              </span>
              後です。
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>失効日はポイントごとに個別管理され、自動で残高から差し引かれます。</li>
              <li>大量失効の 7〜14 日前にリマインド通知を送ると来店促進効果が高まります。</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        {/* ③ 注意点 */}
        <AccordionItem value="point-caution">
          <AccordionTrigger>ポイント利用・付与の注意点</AccordionTrigger>
          <AccordionContent className="space-y-2 text-muted-foreground text-sm leading-relaxed bg-muted p-4 rounded-lg mb-4">
            <ul className="list-disc list-inside space-y-1">
              <li>
                ポイントを利用した決済額部分には新たなポイントは付与されません（二重付与防止）。
              </li>
              <li>
                ポイントの利用は<span className="font-bold">ポイントを付与した店舗</span>でのみ
                有効です。
              </li>

              {/* 利用フローを段階的に説明 */}
              <li>
                ポイント利用フロー:
                <ol className="list-decimal list-inside ml-5 space-y-0.5">
                  <li>顧客が予約時に使用ポイント数を入力・確定</li>
                  <li>
                    予約確定後に <code className="font-mono">利用コード</code> が自動発行
                  </li>
                  <li>来店時に顧客がコードを提示し、スタッフが管理画面へ入力して確定</li>
                </ol>
              </li>
              <li>スタッフ確認が完了しない限りポイントは消費されません（不正利用防止）。</li>

              <li>
                「ポイント対象外メニュー」に設定したメニューには{' '}
                <span className="font-bold">ポイント加算されません</span>が、保有ポイントの
                利用は可能です。
              </li>
              <li>付与率計算の端数は切り捨て推奨です。</li>
              <li>未使用ポイントは会計上「ポイント引当金」として負債計上を推奨します。</li>
              <li>ポイントは現金・他社ポイント等へ換金できません。</li>
              <li>
                予約キャンセル時には<strong>付与予定ポイントを無効化</strong>
                し、利用済みポイントがあれば自動で返還されます。
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </form>
  )
}
