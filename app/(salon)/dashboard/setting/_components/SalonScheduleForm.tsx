'use client';

import { useEffect, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useSalon } from '@/hooks/useSalon';
import { Loading } from '@/components/common';
import { useZodForm } from '@/hooks/useZodForm';
import { z } from 'zod';
import { toast } from 'sonner';
import { handleErrorToMsg } from '@/lib/error';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/common';
import { Clock, Save, Calendar, Clock3, PersonStanding } from 'lucide-react';
import { SALON_RESERVATION_LIMIT_DAYS, SALON_RESERVATION_CANCEL_LIMIT_DAYS } from '@/lib/constants';
import { RESERVATION_INTERVAL_MINUTES_VALUES } from '@/services/convex/shared/types/common';
import type { ReservationIntervalMinutes } from '@/services/convex/shared/types/common';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MAX_TEXT_LENGTH } from '@/services/convex/constants';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Loader2 } from 'lucide-react';

const salonScheduleFormSchema = z.object({
  salonId: z.string(),
  salonScheduleConfigId: z
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
});

// フォーム値の変更を監視
const defaultSchedule = {
  reservationLimitDays: '30',
  availableCancelDays: '3',
  reservationIntervalMinutes: '0',
  availableSheet: '1',
};

export default function SalonScheduleForm() {
  const { salonId } = useSalon();

  const salonScheduleConfig = useQuery(
    api.salon.schedule.query.findBySalonId,
    salonId ? { salonId } : 'skip'
  );

  const addSalonScheduleConfig = useMutation(api.salon.schedule.mutation.create);
  const updateSalonScheduleConfig = useMutation(api.salon.schedule.mutation.update);

  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useZodForm(salonScheduleFormSchema);

  const reservationLimitDaysValue = watch('reservationLimitDays');
  const availableCancelDaysValue = watch('availableCancelDays');
  const reservationIntervalMinutesValue = watch('reservationIntervalMinutes');
  const availableSheetValue = watch('availableSheet');

  // スケジュール設定が変更されたらフォームをリセット
  useEffect(() => {
    if (salonScheduleConfig) {
      // 受信データをサニタイズ
      const scheduleLimitDays = salonScheduleConfig.reservationLimitDays;
      const scheduleCancelDays = salonScheduleConfig.availableCancelDays;
      const scheduleIntervalMinutes = salonScheduleConfig.reservationIntervalMinutes;
      const scheduleAvailableSheet = salonScheduleConfig.availableSheet;
      // データ型の整合性を確保するために明示的に文字列型に変換
      const limitDays =
        scheduleLimitDays !== undefined && scheduleLimitDays !== null
          ? String(scheduleLimitDays)
          : defaultSchedule.reservationLimitDays;

      const cancelDays =
        scheduleCancelDays !== undefined && scheduleCancelDays !== null
          ? String(scheduleCancelDays)
          : defaultSchedule.availableCancelDays;

      const intervalMinutes =
        scheduleIntervalMinutes !== undefined && scheduleIntervalMinutes !== null
          ? String(scheduleIntervalMinutes)
          : defaultSchedule.reservationIntervalMinutes;

      const availableSheet =
        scheduleAvailableSheet !== undefined && scheduleAvailableSheet !== null
          ? String(scheduleAvailableSheet)
          : defaultSchedule.availableSheet;

      // フォーム値をクリアしてから新しい値を設定
      reset({}, { keepValues: false });

      // 少し遅延させてから値を設定
      setTimeout(() => {
        if (salonId) {
          setValue('salonId', salonId);
        }
        setValue('salonScheduleConfigId', salonScheduleConfig._id);
        setValue('reservationLimitDays', limitDays);
        setValue('availableCancelDays', cancelDays);
        setValue('reservationIntervalMinutes', intervalMinutes);
        setValue('availableSheet', availableSheet);
      }, 0);
    } else if (salonId) {
      // 初期値設定
      reset({}, { keepValues: false });

      // 少し遅延させてから値を設定
      setTimeout(() => {
        setValue('salonId', salonId);
        setValue('salonScheduleConfigId', undefined);
        setValue('reservationLimitDays', defaultSchedule.reservationLimitDays);
        setValue('availableCancelDays', defaultSchedule.availableCancelDays);
        setValue('reservationIntervalMinutes', defaultSchedule.reservationIntervalMinutes);
        setValue('availableSheet', defaultSchedule.availableSheet);
      }, 0);
    }
  }, [salonScheduleConfig, reset, setValue, salonId]);

  // フォーム送信処理å
  const onSubmit = useCallback(
    async (data: z.infer<typeof salonScheduleFormSchema>) => {
      if (!salonId) return;

      try {
        // 送信データの整形
        const limitDays = Number(data.reservationLimitDays || defaultSchedule.reservationLimitDays);
        const cancelDays = Number(data.availableCancelDays || defaultSchedule.availableCancelDays);
        const intervalMinutes = Number(
          data.reservationIntervalMinutes || defaultSchedule.reservationIntervalMinutes
        ) as ReservationIntervalMinutes;
        const availableSheet = Number(data.availableSheet || defaultSchedule.availableSheet);
        if (salonScheduleConfig?._id) {
          // 既存のデータを更新する場合
          await updateSalonScheduleConfig({
            salonId,
            availableCancelDays: cancelDays,
            reservationIntervalMinutes: intervalMinutes,
            reservationLimitDays: limitDays,
            availableSheet: availableSheet,
          });
        } else {
          // 新規作成の場合
          await addSalonScheduleConfig({
            salonId,
            availableCancelDays: cancelDays,
            reservationIntervalMinutes: intervalMinutes,
            reservationLimitDays: limitDays,
            availableSheet: availableSheet,
          });
        }

        toast.success('スケジュール設定を保存しました');

        // フォームのdirty状態をリセット
        reset(
          {
            salonId,
            salonScheduleConfigId: salonScheduleConfig?._id,
            reservationLimitDays: data.reservationLimitDays,
            availableCancelDays: data.availableCancelDays,
            reservationIntervalMinutes: data.reservationIntervalMinutes,
            availableSheet: data.availableSheet,
          },
          { keepDirty: false }
        );
      } catch (error) {
        toast.error(handleErrorToMsg(error));
      }
    },
    [addSalonScheduleConfig, updateSalonScheduleConfig, salonId, salonScheduleConfig, reset]
  );

  if (!salonId) {
    return <Loading />;
  }

  if (salonScheduleConfig === undefined) {
    return <Loading />;
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-blue-500" />
        <h4 className="text-lg font-bold">予約受付設定</h4>
      </div>
      <p className="text-sm text-muted-foreground">
        予約受付設定は、サロンの予約の受け付け時間の設定を変更する編集できます。
      </p>
      <form
        className="pt-6"
        onSubmit={handleSubmit(onSubmit)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
            e.preventDefault();
          }
        }}
      >
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-1/2">
              <FormField
                label="予約受付最大日数"
                icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
                error={errors.reservationLimitDays?.message ?? ''}
                tooltip="予約受付可能日数を設定します"
              >
                <Select
                  value={reservationLimitDaysValue || defaultSchedule.reservationLimitDays}
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
              </FormField>
            </div>
            <div className="w-full md:w-1/2">
              <FormField
                label="キャンセル可能日数"
                icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
                error={errors.availableCancelDays?.message ?? ''}
                tooltip="予約日の何日前までキャンセル可能かを設定します"
              >
                <Select
                  value={availableCancelDaysValue || defaultSchedule.availableCancelDays}
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
              </FormField>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-1/2">
              <FormField
                label="予約間隔（分）"
                icon={<Clock3 className="h-4 w-4 text-muted-foreground" />}
                error={errors.reservationIntervalMinutes?.message ?? ''}
                tooltip="予約の最小時間間隔を設定します。"
              >
                <Select
                  value={
                    reservationIntervalMinutesValue || defaultSchedule.reservationIntervalMinutes
                  }
                  onValueChange={(value) => {
                    const validValue = value || defaultSchedule.reservationIntervalMinutes;
                    setValue('reservationIntervalMinutes', validValue, { shouldDirty: true });
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
                <p className="text-xs text-muted-foreground">
                  予約が埋まる事で予約間隔未満の時間が余ってしまう時間枠を非表示にします。
                </p>
              </FormField>
            </div>

            <div className="w-full md:w-1/2">
              <FormField
                label="予約可能席数"
                icon={<PersonStanding className="h-4 w-4 text-muted-foreground" />}
                error={errors.availableSheet?.message ?? ''}
                tooltip="予約可能席数を設定します"
              >
                <Select
                  value={availableSheetValue || defaultSchedule.availableSheet}
                  onValueChange={(value) => {
                    // 空の値の場合はデフォルト値の'30'を設定
                    const validValue = value || defaultSchedule.availableSheet;
                    setValue('availableSheet', validValue, { shouldDirty: true });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="予約可能席数を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 60 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {i + 1}席
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  同一時間帯に予約可能な席数を設定します
                </p>
              </FormField>
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
                営業時間を保存
              </>
            )}
          </Button>
        </div>
      </form>

      <Accordion type="multiple" className="mt-8">
        <Accordion type="single" collapsible>
          <AccordionItem value="max-days">
            <AccordionTrigger>予約受付最大日数の設定とは？</AccordionTrigger>
            <AccordionContent className="text-sm text-slate-600 space-y-4">
              <section>
                <p className="font-bold text-base text-slate-800 mb-2">
                  予約受付最大日数の設定について
                </p>

                <ul className="list-disc list-inside space-y-1 bg-slate-100 p-4 rounded-md">
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

                <p className="font-bold text-slate-800 mt-2">注意点</p>
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
          <AccordionContent className="text-sm text-slate-600 space-y-4">
            <section>
              <p className="font-bold text-base mb-2 text-slate-800">
                キャンセル可能日数の設定について
              </p>

              <ul className="list-disc list-inside space-y-1 bg-slate-100 p-4 rounded-md">
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

              <p className="font-bold text-slate-800 mt-2">注意点</p>
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
          <AccordionContent className="text-sm text-slate-600 space-y-4">
            <section>
              <p className="font-bold text-base mb-2 text-slate-800">予約間隔の設定について</p>

              <ul className="list-disc list-inside space-y-1 bg-slate-100 p-4 rounded-md">
                <li>
                  現在、予約間隔は
                  <span className="font-semibold"> {watch('reservationIntervalMinutes')} 分</span>
                  に設定されています。
                </li>
                <li>
                  <span className="font-bold">目的：</span>
                  隙間時間の発生を抑え、席・スタッフの稼働率を最大化するために
                  顧客へ提示する開始時刻を制限します。
                </li>
                <li>
                  <span className="font-bold">例：</span>
                  施術時間が<strong>30&nbsp;分</strong>の場合…
                  <ul className="list-disc list-inside ml-5 space-y-1">
                    <li>
                      間隔<strong>0&nbsp;分</strong> → 08:00, 08:30, 09:00, 09:30 …
                    </li>
                    <li>
                      間隔<strong>30&nbsp;分</strong> → 08:00, 08:30, 09:00, 09:30 …
                      （0&nbsp;分と同じだが内部ロジックを合わせやすい）
                    </li>
                    <li>
                      間隔<strong>60&nbsp;分</strong> → 08:00, 09:00, 10:00 …
                      （30&nbsp;分の端数枠は非表示）
                    </li>
                  </ul>
                </li>
              </ul>

              <p className="font-bold text-slate-800 mt-2">注意点</p>
              <ul className="list-disc list-inside space-y-1">
                <li>間隔が長すぎると空席があっても予約候補に表示されず稼働率が低下します。</li>
                <li>間隔が短すぎると候補が多くなり、顧客が選びづらくなる場合があります。</li>
                <li>
                  短すぎると顧客は細かく時間を選択できますが、サロンの無駄な待ち時間が発生しやすくなります。
                  <strong>60&nbsp;分</strong>
                  などの間隔を設定するのがおすすめです。60分間隔で予約を受け付けると、顧客が予約から予約を受ける際に60分未満の時間が余ってしまう予約枠が非表示になり無駄な待ち時間の発生を抑えることができます。
                </li>
              </ul>
            </section>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-4">
          <AccordionTrigger>予約可能席数の設定について</AccordionTrigger>
          <AccordionContent className="text-sm text-slate-600 space-y-4">
            <section>
              <p className="font-bold text-base mb-2 text-slate-800">予約可能席数の設定について</p>

              <ul className="list-disc list-inside space-y-1 bg-slate-100 p-4 rounded-md">
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

              <p className="font-bold text-slate-800 mt-2">注意点</p>
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
      </Accordion>
    </div>
  );
}
