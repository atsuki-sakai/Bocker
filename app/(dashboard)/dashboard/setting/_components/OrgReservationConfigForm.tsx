'use client'

import { useEffect, useCallback } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Loading } from '@/components/common'
import { useZodForm } from '@/hooks/useZodForm'
import { z } from 'zod'
import { toast } from 'sonner'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { Button } from '@/components/ui/button'
import { Save } from 'lucide-react'
import { SALON_RESERVATION_LIMIT_DAYS, SALON_RESERVATION_CANCEL_LIMIT_DAYS } from '@/lib/constants'
import { RESERVATION_INTERVAL_MINUTES_VALUES } from '@/convex/types'
import type { ReservationIntervalMinutes } from '@/convex/types'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MAX_TEXT_LENGTH } from '@/convex/constants'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Loader2 } from 'lucide-react'

const orgReservationConfigFormSchema = z.object({
  tenantId: z.string(),
  orgId: z.string(),
  reservationConfigId: z
    .string()
    .max(MAX_TEXT_LENGTH, { message: '最大文字数を超えています' })
    .optional(),
  reservationLimitDays: z
    .string()
    .max(MAX_TEXT_LENGTH, { message: '最大文字数を超えています' })
    .optional(),
  availableCancelDays: z
    .string()
    .max(MAX_TEXT_LENGTH, { message: '最大文字数を超えています' })
    .optional(),
  reservationIntervalMinutes: z
    .string()
    .max(MAX_TEXT_LENGTH, { message: '最大文字数を超えています' })
    .optional(),
  availableSheet: z
    .string()
    .max(MAX_TEXT_LENGTH, { message: '最大文字数を超えています' })
    .optional(),
  todayFirstLaterMinutes: z
    .string()
    .max(MAX_TEXT_LENGTH, { message: '最大文字数を超えています' })
    .optional(),
})

// フォーム値の変更を監視
const defaultReservationConfig = {
  reservation_limit_days: '30',
  available_cancel_days: '3',
  reservation_interval_minutes: '30',
  available_sheet: '1',
  today_first_later_minutes: '30',
}

export default function OrgReservationConfigForm() {
  const { tenantId, orgId, isLoaded } = useTenantAndOrganization()
  const { showErrorToast } = useErrorHandler()
  const reservationConfig = useQuery(
    api.organization.reservation_config.query.findByTenantAndOrg,
    tenantId && orgId ? { tenant_id: tenantId, org_id: orgId } : 'skip'
  )

  const addReservationConfig = useMutation(api.organization.reservation_config.mutation.create)
  const updateReservationConfig = useMutation(api.organization.reservation_config.mutation.update)

  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useZodForm(orgReservationConfigFormSchema)

  const reservationLimitDaysValue = watch('reservationLimitDays')
  const availableCancelDaysValue = watch('availableCancelDays')
  const reservationIntervalMinutesValue = watch('reservationIntervalMinutes')
  const availableSheetValue = watch('availableSheet')
  const todayFirstLaterMinutesValue = watch('todayFirstLaterMinutes')

  // スケジュール設定が変更されたらフォームをリセット
  useEffect(() => {
    if (reservationConfig) {
      // 受信データをサニタイズ
      const scheduleLimitDays = reservationConfig.reservation_limit_days
      const scheduleCancelDays = reservationConfig.available_cancel_days
      const scheduleIntervalMinutes = reservationConfig.reservation_interval_minutes
      const scheduleAvailableSheet = reservationConfig.available_sheet
      const scheduleTodayFirstLaterMinutes = reservationConfig.today_first_later_minutes
      // データ型の整合性を確保するために明示的に文字列型に変換
      const limitDays =
        scheduleLimitDays !== undefined && scheduleLimitDays !== null
          ? String(scheduleLimitDays)
          : defaultReservationConfig.reservation_limit_days

      const cancelDays =
        scheduleCancelDays !== undefined && scheduleCancelDays !== null
          ? String(scheduleCancelDays)
          : defaultReservationConfig.available_cancel_days

      const intervalMinutes =
        scheduleIntervalMinutes !== undefined && scheduleIntervalMinutes !== null
          ? String(scheduleIntervalMinutes)
          : defaultReservationConfig.reservation_interval_minutes

      const availableSheet =
        scheduleAvailableSheet !== undefined && scheduleAvailableSheet !== null
          ? String(scheduleAvailableSheet)
          : defaultReservationConfig.available_sheet

      const todayFirstLaterMinutes =
        scheduleTodayFirstLaterMinutes !== undefined && scheduleTodayFirstLaterMinutes !== null
          ? String(scheduleTodayFirstLaterMinutes)
          : defaultReservationConfig.today_first_later_minutes

      // フォーム値をクリアしてから新しい値を設定
      reset({}, { keepValues: false })

      // 少し遅延させてから値を設定
      setTimeout(() => {
        setValue('tenantId', tenantId!)
        setValue('orgId', orgId!)
        setValue('reservationConfigId', reservationConfig._id)
        setValue('reservationLimitDays', limitDays)
        setValue('availableCancelDays', cancelDays)
        setValue('reservationIntervalMinutes', intervalMinutes)
        setValue('availableSheet', availableSheet)
        setValue('todayFirstLaterMinutes', todayFirstLaterMinutes)
      }, 0)
    } else {
      // 初期値設定
      reset({}, { keepValues: false })

      // 少し遅延させてから値を設定
      setTimeout(() => {
        setValue('tenantId', tenantId!)
        setValue('orgId', orgId!)
        setValue('reservationConfigId', undefined)
        setValue('reservationLimitDays', defaultReservationConfig.reservation_limit_days)
        setValue('availableCancelDays', defaultReservationConfig.available_cancel_days)
        setValue(
          'reservationIntervalMinutes',
          defaultReservationConfig.reservation_interval_minutes
        )
        setValue('availableSheet', defaultReservationConfig.available_sheet)
        setValue('todayFirstLaterMinutes', defaultReservationConfig.today_first_later_minutes)
      }, 0)
    }
  }, [reservationConfig, reset, setValue, orgId, tenantId])

  // フォーム送信処理å
  const onSubmit = useCallback(
    async (data: z.infer<typeof orgReservationConfigFormSchema>) => {
      if (!orgId) return

      try {
        // 送信データの整形
        const limitDays = Number(
          data.reservationLimitDays || defaultReservationConfig.reservation_limit_days
        )
        const cancelDays = Number(
          data.availableCancelDays || defaultReservationConfig.available_cancel_days
        )
        const intervalMinutes = Number(
          data.reservationIntervalMinutes || defaultReservationConfig.reservation_interval_minutes
        ) as ReservationIntervalMinutes
        const availableSheet = Number(
          data.availableSheet || defaultReservationConfig.available_sheet
        )
        const todayFirstLaterMinutes = Number(
          data.todayFirstLaterMinutes || defaultReservationConfig.today_first_later_minutes
        )
        if (reservationConfig?._id) {
          // 既存のデータを更新する場合
          await updateReservationConfig({
            reservation_config_id: reservationConfig._id,
            available_cancel_days: cancelDays,
            reservation_interval_minutes: intervalMinutes,
            reservation_limit_days: limitDays,
            available_sheet: availableSheet,
            today_first_later_minutes: todayFirstLaterMinutes,
          })
        } else {
          // 新規作成の場合
          await addReservationConfig({
            tenant_id: tenantId!,
            org_id: orgId!,
            available_cancel_days: cancelDays,
            reservation_interval_minutes: intervalMinutes,
            reservation_limit_days: limitDays,
            available_sheet: availableSheet,
            today_first_later_minutes: todayFirstLaterMinutes,
          })
        }

        toast.success('スケジュール設定を保存しました')

        // フォームのdirty状態をリセット
        reset(
          {
            reservationConfigId: reservationConfig?._id,
            reservationLimitDays: data.reservationLimitDays,
            availableCancelDays: data.availableCancelDays,
            reservationIntervalMinutes: data.reservationIntervalMinutes,
            availableSheet: data.availableSheet,
          },
          { keepDirty: false }
        )
      } catch (error) {
        showErrorToast(error)
      }
    },
    [
      addReservationConfig,
      updateReservationConfig,
      orgId,
      tenantId,
      reservationConfig,
      reset,
      showErrorToast,
    ]
  )

  if (reservationConfig === undefined) {
    return <Loading />
  }
  if (!isLoaded) {
    return <Loading />
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <h4 className="text-2xl font-bold">予約受付設定</h4>
      </div>
      <p className="text-sm text-muted-foreground mt-1">
        予約受付設定は、サロンの予約の受け付け時間の設定を変更する編集できます。
      </p>
      <form
        className="pt-6"
        onSubmit={handleSubmit(onSubmit)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
            e.preventDefault()
          }
        }}
      >
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-1/2">
              <Select
                value={reservationLimitDaysValue || defaultReservationConfig.reservation_limit_days}
                onValueChange={(value) =>
                  setValue('reservationLimitDays', value, { shouldDirty: true })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="予約受付最大日数を選択" />
                </SelectTrigger>
                <SelectContent>
                  {SALON_RESERVATION_LIMIT_DAYS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}日
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                何日先まで予約を受付可能にするかの設定
              </p>
              {errors.reservationLimitDays && (
                <p className="text-xs text-red-500 mt-1">{errors.reservationLimitDays.message}</p>
              )}
            </div>
            <div className="w-full md:w-1/2">
              <Select
                value={availableCancelDaysValue || defaultReservationConfig.available_cancel_days}
                onValueChange={(value) =>
                  setValue('availableCancelDays', value, { shouldDirty: true })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="キャンセル可能日数を選択" />
                </SelectTrigger>
                <SelectContent>
                  {SALON_RESERVATION_CANCEL_LIMIT_DAYS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}日
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                予約日の何日前までキャンセル可能かの設定
              </p>
              {errors.availableCancelDays && (
                <p className="text-xs text-red-500 mt-1">{errors.availableCancelDays.message}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-1/2">
              <Select
                value={
                  reservationIntervalMinutesValue ||
                  defaultReservationConfig.reservation_interval_minutes
                }
                onValueChange={(value) => {
                  const validValue = value || defaultReservationConfig.reservation_interval_minutes
                  setValue('reservationIntervalMinutes', validValue, { shouldDirty: true })
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="予約間隔を選択" />
                </SelectTrigger>
                <SelectContent>
                  {RESERVATION_INTERVAL_MINUTES_VALUES.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value}分
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">予約枠を生成する間隔を設定</p>
              {errors.reservationIntervalMinutes && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.reservationIntervalMinutes.message}
                </p>
              )}
            </div>

            <div className="w-full md:w-1/2">
              <Select
                value={availableSheetValue || defaultReservationConfig.available_sheet}
                onValueChange={(value) => {
                  // 空の値の場合はデフォルト値の'30'を設定
                  const validValue = value || defaultReservationConfig.available_sheet
                  setValue('availableSheet', validValue, { shouldDirty: true })
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="予約可能席数を選択" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 20 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {i + 1}席
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">同一時間帯に予約可能な席数を設定</p>
              {errors.availableSheet && (
                <p className="text-xs text-red-500 mt-1">{errors.availableSheet.message}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-1/2">
              <Select
                value={
                  todayFirstLaterMinutesValue || defaultReservationConfig.today_first_later_minutes
                }
                onValueChange={(value) => {
                  const validValue = value || defaultReservationConfig.today_first_later_minutes
                  setValue('todayFirstLaterMinutes', validValue, { shouldDirty: true })
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="最短の予約開始時間を選択" />
                </SelectTrigger>
                <SelectContent>
                  {RESERVATION_INTERVAL_MINUTES_VALUES.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value}分
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                当日予約でかつ現在空き枠がある場合に最短で何分後から予約を受け付けるかを設定
              </p>
              {errors.todayFirstLaterMinutes && (
                <p className="text-xs text-red-500 mt-1">{errors.todayFirstLaterMinutes.message}</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={isSubmitting || !isDirty} className="min-w-[120px]">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                予約受付設定を保存
              </>
            )}
          </Button>
        </div>
      </form>

      <Accordion type="multiple" className="mt-8">
        <Accordion type="single" collapsible>
          <AccordionItem value="max-days">
            <AccordionTrigger>予約受付最大日数の設定とは？</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-4 leading-6">
              <section>
                <p className="font-bold text-base text-primary mb-2">
                  予約受付最大日数の設定について
                </p>

                <ul className="list-disc list-inside space-y-1 bg-muted p-4 rounded-md">
                  <li>
                    今日を含めて
                    <span className="font-semibold"> {watch('reservationLimitDays')} 日先</span>
                    まで予約を許可します。
                  </li>
                  <li>
                    <span className="font-bold">例：</span>設定値が<strong>30</strong>日の場合、4 月
                    27 日に開く カレンダーでは<strong>5 月 27 日</strong>までの日付が選択可能です。
                  </li>
                  <li>
                    カレンダー UI
                    では制限を超える日付が自動でグレーアウトされ、選択できなくなります。
                  </li>
                </ul>

                <p className="font-bold text-primary mt-2">注意点</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>短すぎるとリピート客が次回予約を取りづらくなり、機会損失につながります。</li>
                  <li>長すぎると遠い将来の仮予約が増え、キャンセル率が高まる傾向があります。</li>
                  <li>
                    繁忙期（卒業・成人式シーズンなど）は<strong>60〜90 日</strong>
                    に延長し、閑散期は短縮するなど、
                    シーズナリティに合わせて調整するのがおすすめです。
                  </li>
                </ul>
              </section>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <AccordionItem value="item-2">
          <AccordionTrigger>キャンセル可能日数の設定について</AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground space-y-4 leading-6">
            <section>
              <p className="font-bold text-base mb-2 text-primary">
                キャンセル可能日数の設定について
              </p>

              <ul className="list-disc list-inside space-y-1 bg-muted p-4 rounded-md">
                <li>
                  予約日の{' '}
                  <span className="font-semibold">{watch('availableCancelDays')} 日前</span>{' '}
                  までキャンセルを許可します。
                </li>
                <li>
                  <span className="font-bold">例：</span>キャンセル可能日数を<strong>3</strong>
                  日に設定すると、5 月 10 日 10:00 の予約は<strong>5 月 7 日 23:59</strong>
                  までならシステム経由でキャンセルできます。
                </li>
                <li>
                  期日を過ぎると予約詳細画面の<strong>キャンセルボタンが非表示</strong>
                  になり、顧客は直接お店に連絡するフローになります。
                </li>
              </ul>

              <p className="font-bold text-primary mt-2">注意点</p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  設定値が短いと<strong>直前キャンセル</strong>
                  が増えやすく、空き枠の再販が難しくなります。
                </li>
                <li>
                  長過ぎると逆に顧客の予定変更がしづらくなり、結果として<strong>機会損失</strong>
                  が生じる可能性があります。
                </li>
                <li>
                  繁忙期や長時間施術（縮毛矯正・ブリーチなど）は<strong>7〜14 日前</strong>
                  に設定するなど、メニューや季節で調整するのがおすすめです。
                </li>
              </ul>
            </section>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-3">
          <AccordionTrigger>予約間隔の設定でどの様な変化がありますか？</AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground space-y-4 leading-6">
            <section>
              <p className="font-bold text-base mb-2 text-primary">予約間隔の設定について</p>

              <ul className="list-disc list-inside space-y-1 bg-muted p-4 rounded-md">
                <li>
                  生成される予約枠の間隔は施術時間との時間か予約間隔のどちらか大きい方になります。
                  現在、予約間隔は
                  <span className="font-semibold"> {watch('reservationIntervalMinutes')} 分</span>
                  に設定されています。
                </li>
                <li>
                  例えば施術時間が30分で予約間隔が60分の場合、生成される予約枠の間隔は60分になります。
                </li>
                <li>
                  施術時間が30分で予約間隔が30分の場合、生成される予約枠の間隔は30分になります。
                </li>
                <li>
                  施術時間が30分で予約間隔が15分の場合、生成される予約枠の間隔は30分になります。
                </li>
                <li>
                  <span className="font-bold">目的：</span>
                  予約枠の開始時刻は<span className="font-semibold">予約間隔</span> の倍数に揃え、
                  端数枠を非表示にすることで席・スタッフの稼働率を最大化します。
                </li>
                <li>
                  <span className="font-bold">例：</span>
                  <ul className="list-disc list-inside ml-5 space-y-1">
                    <li>
                      予約間隔<strong>0&nbsp;分</strong> → 施術時間のみで区切り (例: 30 分施術なら
                      08:00, 08:30, 09:00 …)
                    </li>
                    <li>
                      予約間隔<strong>30&nbsp;分</strong> → 08:00, 08:30, 09:00, 09:30 … （30
                      分単位で揃える）
                    </li>
                    <li>
                      予約間隔<strong>60&nbsp;分</strong> → 08:00, 09:00, 10:00 … （30
                      分の端数枠は非表示）
                    </li>
                  </ul>
                </li>
              </ul>

              <p className="font-bold text-primary mt-2">注意点</p>
              <ul className="list-disc list-inside space-y-1">
                <li>間隔が長すぎると空席があっても予約候補に表示されず稼働率が低下します。</li>
                <li>間隔が短すぎると候補が多くなり、顧客が選びづらくなる場合があります。</li>
                <li>
                  短すぎると顧客は細かく時間を選択できますが、サロンの無駄な待ち時間が発生しやすくなります。
                  <strong>60&nbsp;分</strong>
                  などの <span className="font-semibold">minSlotSize</span>{' '}
                  を設定するのがおすすめです。60分間隔で予約を受け付けると、顧客が予約から予約を受ける際に60分未満の時間が余ってしまう予約枠が非表示になり無駄な待ち時間の発生を抑えることができます。
                </li>
                <li>
                  推奨設定は<strong>60分間隔</strong>になります。
                </li>
              </ul>
            </section>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-4">
          <AccordionTrigger>予約可能席数の設定について</AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground space-y-4 leading-6">
            <section>
              <p className="font-bold text-base mb-2 text-primary">予約可能席数の設定について</p>

              <ul className="list-disc list-inside space-y-1 bg-muted p-4 rounded-md">
                <li>
                  現在、同一時間帯に<strong>{watch('availableSheet')} 席</strong>
                  まで予約を受け付ける設定です。
                </li>
                <li>
                  <span className="font-bold">例：</span>席数を<strong>5</strong>
                  に設定した場合、08:00〜09:00 の枠では最大<strong>5 件</strong>
                  まで同時予約できます。すでに同一時間帯に席が全て埋まっておりスタッフに空きがあっても08:00〜09:00
                  は表示されなくなり選択できなくなります。
                </li>
                <li>
                  パーマやカラーの<strong>放置時間</strong>
                  でスタッフの待機が発生し席に空きが出れば、その時間帯に
                  新しい予約枠が自動で開放されます。
                </li>
              </ul>

              <p className="font-bold text-primary mt-2">注意点</p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  席数を過大に設定すると<strong>オーバーブッキング</strong>
                  の恐れがあります。店舗での最大同時受付数を超える席数を設定すると席が空いていないのに予約が受け付けてしまうという事が発生します。
                </li>
                <li>
                  スタッフ数や施術工程を考慮し、実際に<strong>同時対応可能</strong>
                  な席数を設定してください。
                </li>
              </ul>
            </section>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-5">
          <AccordionTrigger>最短の予約開始時間の設定について</AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground space-y-4 leading-6">
            <p className="font-bold text-base mb-2 text-primary">
              最短の予約開始時間の設定について
            </p>

            <p>
              「最短の予約開始時間」は、当日予約の際に現在時刻から何分後以降の予約を受け付けるかを設定するものです。
              例えば <strong>{watch('todayFirstLaterMinutes')} 分</strong>{' '}
              に設定されている場合、現在時刻からその時間が経過した以降の予約枠のみ表示されます。
              急な来店による対応負荷を避けるために活用できます。
            </p>
            <ul className="list-disc list-inside space-y-1 bg-muted p-4 rounded-md">
              <li>
                当日予約を受け付ける際に当日予約でかつ現在空き枠がある場合に
                <strong>{watch('todayFirstLaterMinutes')} 分</strong>
                後から予約を受け付ける設定です。
                <br />
                <span className="text-muted-foreground">
                  （例：現在時刻が <strong>10:00</strong> で、設定が <strong>30分</strong> の場合、
                  <strong>10:30 以降</strong> の空き枠のみ予約が可能になります。 10:00〜10:30
                  の枠が空いていても、表示されず予約できません。）
                </span>
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
