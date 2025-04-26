'use client';

import { useEffect, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useSalon } from '@/hooks/useSalon';
import { Loading } from '@/components/common';
import { Button } from '@/components/ui/button';
import { useZodForm } from '@/hooks/useZodForm';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';
import { handleErrorToMsg } from '@/lib/error';
import { motion } from 'framer-motion';
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
        <div className="text-sm text-muted-foreground mt-2 bg-blue-50 rounded-md p-3 max-w-4xl">
          <p className="font-bold text-base mb-2 text-blue-600">予約間隔の設定について</p>
          <ul className="list-disc list-inside space-y-1 text-blue-600">
            予約時間枠の「間隔」設定 — ポイントまとめ
            <p className="font-bold">目的</p>
            <li>
              顧客の予約候補を絞り込み、無駄な待ち時間（中途半端な空き）を発生させないための設定です。
            </li>
            <li>間隔を「0 分」にすると</li>
            <li>期間内のすべての開始時刻（1 分刻みを含む）がそのまま表示されます。</li>
            <li>例：08:00、08:01、08:02 … と細かく並ぶ。</li>
            <li>間隔を「60 分」にすると</li>
            <li>
              予約開始可能時刻が 08:00 の場合、08:00 ちょうどを基準に 1
              時間ごと（08:00、09:00、10:00 …）の枠だけが表示されます。
            </li>
            <li>08:30 など端数の枠は出ないため、余計な空き時間が生まれにくくなります。</li>
            <p className="font-bold">注意点</p>
            <li>
              端数開始（08:01〜08:59
              など）の枠は一切表示されなくなるので、必要な場合は間隔を短めに設定してください。
            </li>
          </ul>
        </div>

        <motion.div className="mt-6 flex justify-end" layout>
          <motion.div
            whileHover={{ scale: isDirty ? 1.03 : 1 }}
            whileTap={{ scale: isDirty ? 0.97 : 1 }}
          >
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
          </motion.div>
        </motion.div>
      </form>
    </div>
  );
}
