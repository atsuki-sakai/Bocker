'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useSalon } from '@/hooks/useSalon';
import { Loading } from '@/components/common';
import { Button } from '@/components/ui/button';
import { useZodForm } from '@/hooks/useZodForm';
import { z } from 'zod';
import { toast } from 'sonner';
import { handleError } from '@/lib/error';
import { motion, AnimatePresence } from 'framer-motion';
import { FormField } from '@/components/common';
import { Clock, Save, Calendar, Clock3, Check } from 'lucide-react';
import { SALON_RESERVATION_LIMIT_DAYS, SALON_RESERVATION_CANCEL_LIMIT_DAYS } from '@/lib/constants';
import { RESERVATION_INTERVAL_MINUTES_VALUES } from '@/services/convex/shared/types/common';
import type { ReservationIntervalMinutes } from '@/services/convex/shared/types/common';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  const [saveSuccess, setSaveSuccess] = useState(false);

  // デバッグ用のステート追加
  const [formValues, setFormValues] = useState({
    reservationLimitDays: '',
    availableCancelDays: '',
    reservationIntervalMinutes: '',
    availableSheet: '',
  });

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
    getValues,
    formState: { errors, isSubmitting, isDirty },
  } = useZodForm(salonScheduleFormSchema);

  const reservationLimitDaysValue = watch('reservationLimitDays');
  const availableCancelDaysValue = watch('availableCancelDays');
  const reservationIntervalMinutesValue = watch('reservationIntervalMinutes');
  const availableSheetValue = watch('availableSheet');
  // フォーム値の変更をデバッグステートに反映
  useEffect(() => {
    setFormValues({
      reservationLimitDays: reservationLimitDaysValue || '',
      availableCancelDays: availableCancelDaysValue || '',
      reservationIntervalMinutes: reservationIntervalMinutesValue || '',
      availableSheet: availableSheetValue || '',
    });
  }, [
    reservationLimitDaysValue,
    availableCancelDaysValue,
    reservationIntervalMinutesValue,
    availableSheetValue,
  ]);

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
        setSaveSuccess(true);

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
        const errorDetails = handleError(error);
        toast.error(errorDetails.message);
      }
    },
    [
      addSalonScheduleConfig,
      updateSalonScheduleConfig,
      salonId,
      salonScheduleConfig,
      reset,
      setSaveSuccess,
    ]
  );

  if (!salonId) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (salonScheduleConfig === undefined) {
    return <Loading />;
  }

  console.log('現在のフォーム値:', getValues());
  console.log('デバッグステート値:', formValues);

  return (
    <motion.div
      className=""
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="shadow-md border-0 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            営業時間設定
          </CardTitle>
          <CardDescription>通常の営業時間帯と予約間隔を設定してください</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form
            onSubmit={handleSubmit(onSubmit)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                e.preventDefault();
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
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
                  </FormField>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/2">
                  <FormField
                    label="予約間隔（分）"
                    icon={<Clock3 className="h-4 w-4 text-muted-foreground" />}
                    error={errors.reservationIntervalMinutes?.message ?? ''}
                    tooltip="予約の最小時間間隔を設定します"
                  >
                    <Select
                      value={
                        reservationIntervalMinutesValue ||
                        defaultSchedule.reservationIntervalMinutes
                      }
                      onValueChange={(value) => {
                        // 空の値の場合はデフォルト値の'30'を設定
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
                  </FormField>
                </div>
              </div>
            </motion.div>

            <motion.div className="mt-6 flex justify-end" layout>
              <AnimatePresence>
                {saveSuccess && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center mr-4 text-green-600"
                  >
                    <Check className="mr-1 h-4 w-4" />
                    保存しました
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.div
                whileHover={{ scale: isDirty ? 1.03 : 1 }}
                whileTap={{ scale: isDirty ? 0.97 : 1 }}
              >
                <Button type="submit" disabled={isSubmitting || !isDirty} className="min-w-[120px]">
                  {isSubmitting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <svg className="h-4 w-4 text-white" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                      </motion.div>
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
        </CardContent>
      </Card>
    </motion.div>
  );
}
