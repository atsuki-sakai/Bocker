'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Id } from '@/convex/_generated/dataModel';
import { handleError } from '@/lib/error';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Clock,
  Calendar,
  Save,
  CheckCircle2,
  Clock3,
  Coffee,
  Settings2,
  AlertCircle,
  X,
  Check,
  CalendarClock,
} from 'lucide-react';
import { api } from '@/convex/_generated/api';
import { useQuery, useMutation } from 'convex/react';
import { useSalon } from '@/hooks/useSalon';
import { Loading } from '@/components/common';
import { useZodForm } from '@/hooks/useZodForm';
import { z } from 'zod';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

const salonScheduleConfigSchema = z.object({
  salonId: z.string().optional(),
  dayOfWeek: z.string().optional(),
  isOpen: z.boolean().optional(),
  startHour: z.string().optional(),
  endHour: z.string().optional(),
});

// 曜日の定義（日本語と英語の対応）- 月曜から日曜の順
const DAYS_OF_WEEK = [
  {
    id: 'monday',
    week: '月曜日',
    shortWeek: '月',
    color: 'bg-green-50 border-green-200 text-green-700',
  },
  {
    id: 'tuesday',
    week: '火曜日',
    shortWeek: '火',
    color: 'bg-green-50 border-green-200 text-green-700',
  },
  {
    id: 'wednesday',
    week: '水曜日',
    shortWeek: '水',
    color: 'bg-green-50 border-green-200 text-green-700',
  },
  {
    id: 'thursday',
    week: '木曜日',
    shortWeek: '木',
    color: 'bg-green-50 border-green-200 text-green-700',
  },
  {
    id: 'friday',
    week: '金曜日',
    shortWeek: '金',
    color: 'bg-green-50 border-green-200 text-green-700',
  },
  {
    id: 'saturday',
    week: '土曜日',
    shortWeek: '土',
    color: 'bg-orange-50 border-orange-200 text-orange-700',
  },
  {
    id: 'sunday',
    week: '日曜日',
    shortWeek: '日',
    color: 'bg-orange-50 border-orange-200 text-orange-700',
  },
];

// サロン曜日スケジュールの型定義
export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

// 各曜日の営業時間設定
export interface DaySchedule {
  isOpen: boolean;
  startHour: string;
  endHour: string;
  scheduleId?: string; // 既存レコードのID
}

// 曜日スケジュールデータ
export interface WeekScheduleData {
  // 各曜日の設定
  scheduleSettings: Record<DayOfWeek, DaySchedule>;
  // 共通設定
  useCommonHours: boolean;
  commonStartHour: string;
  commonEndHour: string;
}

// アニメーション設定
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const fadeInVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

const defaultScheduleHour = { startHour: '08:00', endHour: '19:00' };

export default function WeekHourSchedule() {
  const { salonId } = useSalon();
  const [showToast, setShowToast] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [scheduleTab, setScheduleTab] = useState('common');

  // スケジュールデータの状態
  const [weekScheduleData, setWeekScheduleData] = useState<WeekScheduleData>({
    scheduleSettings: {
      monday: { isOpen: false, ...defaultScheduleHour },
      tuesday: { isOpen: false, ...defaultScheduleHour },
      wednesday: { isOpen: false, ...defaultScheduleHour },
      thursday: { isOpen: false, ...defaultScheduleHour },
      friday: { isOpen: false, ...defaultScheduleHour },
      saturday: { isOpen: false, ...defaultScheduleHour },
      sunday: { isOpen: false, ...defaultScheduleHour },
    },
    useCommonHours: true,
    commonStartHour: defaultScheduleHour.startHour,
    commonEndHour: defaultScheduleHour.endHour,
  });

  // すでに登録されているデータを取得
  const salonWeekSchedules = useQuery(
    api.schedule.salon_week_schedule.query.getAllBySalonId,
    salonId ? { salonId } : 'skip'
  );

  const updateWeekSchedule = useMutation(
    api.schedule.salon_week_schedule.mutation.updateWeekSchedule
  );

  const { handleSubmit } = useZodForm(salonScheduleConfigSchema);

  // 時間の選択肢を生成（メモ化で最適化）
  const timeOptions = useMemo(() => {
    const options: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const h = hour.toString().padStart(2, '0');
        const m = minute.toString().padStart(2, '0');
        options.push(`${h}:${m}`);
      }
    }
    options.push('24:00');
    return options;
  }, []);

  // 開始時間より後の時間オプションをフィルタリングする関数（メモ化）
  const getEndHourOptions = useCallback(
    (startHour: string) => {
      return timeOptions.filter((time) => time > startHour);
    },
    [timeOptions]
  );

  // 共通設定用の終了時間オプション（メモ化）
  const commonEndHourOptions = useMemo(
    () => getEndHourOptions(weekScheduleData.commonStartHour),
    [weekScheduleData.commonStartHour, getEndHourOptions]
  );

  // DBから取得したスケジュールデータを初期表示に反映
  useEffect(() => {
    if (salonWeekSchedules && Array.isArray(salonWeekSchedules) && salonWeekSchedules.length > 0) {
      // 初期データロード時のみ反映するために、scheduleIdが設定されていない場合のみ更新する
      const shouldUpdateSchedule = Object.values(weekScheduleData.scheduleSettings).some(
        (setting) => !setting.scheduleId
      );

      if (shouldUpdateSchedule) {
        const newScheduleSettings = { ...weekScheduleData.scheduleSettings };
        let earliestStartHour = '24:00'; // 最も早い開始時間を追跡
        let latestEndHour = '00:00'; // 最も遅い終了時間を追跡
        let hasOpenDay = false; // 営業日があるかどうかを追跡

        salonWeekSchedules.forEach((schedule) => {
          if (schedule.dayOfWeek && typeof schedule.dayOfWeek === 'string') {
            const dayOfWeek = schedule.dayOfWeek as DayOfWeek;
            const isOpen = schedule.isOpen ?? false;
            const startHour = schedule.startHour || defaultScheduleHour.startHour;
            const endHour = schedule.endHour || defaultScheduleHour.endHour;

            newScheduleSettings[dayOfWeek] = {
              isOpen,
              startHour,
              endHour,
              scheduleId: schedule._id,
            };

            // 営業日の場合、最も早い開始時間と最も遅い終了時間を更新
            if (isOpen) {
              hasOpenDay = true;
              if (startHour < earliestStartHour) {
                earliestStartHour = startHour;
              }
              if (endHour > latestEndHour) {
                latestEndHour = endHour;
              }
            }
          }
        });

        // 共通時間を更新（営業日がある場合のみ）
        const updatedCommonHours = {
          commonStartHour: hasOpenDay ? earliestStartHour : defaultScheduleHour.startHour,
          commonEndHour: hasOpenDay ? latestEndHour : defaultScheduleHour.endHour,
        };

        setWeekScheduleData((prev) => ({
          ...prev,
          ...updatedCommonHours,
          scheduleSettings: newScheduleSettings,
        }));
      }
    }
  }, [salonWeekSchedules]); // eslint-disable-line react-hooks/exhaustive-deps

  // 営業日変更時の処理
  const handleDayToggle = useCallback((day: DayOfWeek) => {
    setWeekScheduleData((prev) => {
      const newScheduleSettings = { ...prev.scheduleSettings };
      const dayId = day as DayOfWeek;

      // 営業状態を切り替え
      const newIsOpen = !newScheduleSettings[dayId].isOpen;

      // 営業状態がONになるとき
      if (newIsOpen) {
        // 共通設定がONの場合は共通の時間設定を適用
        if (prev.useCommonHours) {
          newScheduleSettings[dayId] = {
            isOpen: true,
            startHour: prev.commonStartHour,
            endHour: prev.commonEndHour,
            ...(newScheduleSettings[dayId].scheduleId
              ? { scheduleId: newScheduleSettings[dayId].scheduleId }
              : {}),
          };
        } else {
          newScheduleSettings[dayId] = {
            isOpen: true,
            startHour: newScheduleSettings[dayId].startHour,
            endHour: newScheduleSettings[dayId].endHour,
            ...(newScheduleSettings[dayId].scheduleId
              ? { scheduleId: newScheduleSettings[dayId].scheduleId }
              : {}),
          };
        }
      } else {
        // 営業状態をOFFに
        newScheduleSettings[dayId] = {
          ...newScheduleSettings[dayId],
          isOpen: false,
          ...(newScheduleSettings[dayId].scheduleId
            ? { scheduleId: newScheduleSettings[dayId].scheduleId }
            : {}),
        };
      }

      return {
        ...prev,
        scheduleSettings: newScheduleSettings,
      };
    });
  }, []);

  // 共通営業時間設定の切り替え
  const handleUseCommonHoursChange = useCallback((checked: boolean) => {
    setWeekScheduleData((prev) => {
      const newScheduleSettings = { ...prev.scheduleSettings };
      if (checked) {
        // 共通設定がONになるタイミングで、営業日の時間を一括で共通にそろえる
        Object.keys(newScheduleSettings).forEach((day) => {
          const dayId = day as DayOfWeek;
          if (newScheduleSettings[dayId].isOpen) {
            newScheduleSettings[dayId].startHour = prev.commonStartHour;
            newScheduleSettings[dayId].endHour = prev.commonEndHour;
          }
        });
      }

      return {
        ...prev,
        useCommonHours: checked,
        scheduleSettings: newScheduleSettings,
      };
    });
  }, []);

  // 共通開始時間の変更
  const handleCommonStartHourChange = useCallback(
    (value: string) => {
      setWeekScheduleData((prev) => {
        const newScheduleSettings = { ...prev.scheduleSettings };

        // 終了時間が開始時間より前になる場合、終了時間を調整
        let newEndHour = prev.commonEndHour;
        if (newEndHour <= value) {
          // 開始時間の次の時間帯を終了時間に設定
          const endHourOptions = getEndHourOptions(value);
          newEndHour = endHourOptions.length > 0 ? endHourOptions[0] : '24:00';
        }

        if (prev.useCommonHours) {
          Object.keys(newScheduleSettings).forEach((day) => {
            const dayId = day as DayOfWeek;
            if (newScheduleSettings[dayId].isOpen) {
              newScheduleSettings[dayId].startHour = value;
              // 終了時間も調整
              if (newScheduleSettings[dayId].endHour <= value) {
                newScheduleSettings[dayId].endHour = newEndHour;
              }
            }
          });
        }

        return {
          ...prev,
          commonStartHour: value,
          commonEndHour: newEndHour,
          scheduleSettings: newScheduleSettings,
        };
      });
    },
    [getEndHourOptions]
  );

  // 共通終了時間の変更
  const handleCommonEndHourChange = useCallback((value: string) => {
    setWeekScheduleData((prev) => {
      const newScheduleSettings = { ...prev.scheduleSettings };
      if (prev.useCommonHours) {
        Object.keys(newScheduleSettings).forEach((day) => {
          const dayId = day as DayOfWeek;
          if (newScheduleSettings[dayId].isOpen) {
            newScheduleSettings[dayId].endHour = value;
          }
        });
      }

      return {
        ...prev,
        commonEndHour: value,
        scheduleSettings: newScheduleSettings,
      };
    });
  }, []);

  // 個別の曜日設定の更新
  const updateDaySchedule = useCallback(
    (day: DayOfWeek, field: 'startHour' | 'endHour', value: string) => {
      setWeekScheduleData((prev) => {
        const newScheduleSettings = { ...prev.scheduleSettings };

        if (field === 'startHour') {
          // 開始時間を変更した場合、終了時間が開始時間より前になる場合は終了時間も調整
          const currentEndHour = newScheduleSettings[day].endHour;
          if (currentEndHour <= value) {
            const endHourOptions = getEndHourOptions(value);
            const newEndHour = endHourOptions.length > 0 ? endHourOptions[0] : '24:00';
            newScheduleSettings[day] = {
              ...newScheduleSettings[day],
              startHour: value,
              endHour: newEndHour,
            };
          } else {
            newScheduleSettings[day] = {
              ...newScheduleSettings[day],
              startHour: value,
            };
          }
        } else {
          // 終了時間の変更
          newScheduleSettings[day] = {
            ...newScheduleSettings[day],
            endHour: value,
          };
        }

        return {
          ...prev,
          scheduleSettings: newScheduleSettings,
        };
      });
    },
    [getEndHourOptions]
  );

  // 営業中の曜日を取得（メモ化）
  const activeDays = useMemo(
    () =>
      Object.entries(weekScheduleData.scheduleSettings)
        .filter(([, setting]) => setting.isOpen)
        .map(([day]) => day),
    [weekScheduleData.scheduleSettings]
  );

  // フォーム送信で Mutation 呼び出し
  const onSubmit = useCallback(async () => {
    // 送信中状態を設定
    setIsSaving(true);

    // 送信前にscheduleIdを除外した新しいオブジェクトを作成
    const cleanedScheduleSettings: Record<
      string,
      { isOpen: boolean; startHour: string; endHour: string }
    > = {};

    // 各曜日のデータからscheduleIdを除外
    Object.entries(weekScheduleData.scheduleSettings).forEach(([day, settings]) => {
      cleanedScheduleSettings[day] = {
        isOpen: settings.isOpen,
        startHour: settings.startHour,
        endHour: settings.endHour,
      };
    });

    try {
      await updateWeekSchedule({
        salonId: salonId as Id<'salon'>,
        scheduleSettings: cleanedScheduleSettings,
      });

      // 成功メッセージ
      toast.success('営業時間を更新しました');

      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      const errorDetails = handleError(err);
      toast.error(errorDetails.message);
    } finally {
      setIsSaving(false);
    }
  }, [weekScheduleData, salonId, updateWeekSchedule]);

  // ローディング状態
  if (salonWeekSchedules === undefined) {
    return <Loading />;
  }

  return (
    <motion.div
      className=""
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 border-b">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-blue-500" />
            <CardTitle>営業日・営業時間設定</CardTitle>
          </div>
          <CardDescription>
            サロンの営業日と営業時間を設定します。定休日には予約を受け付けません。
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6">
          <motion.div className="space-y-8" variants={containerVariants}>
            {/* 営業日設定 */}
            <motion.div variants={itemVariants}>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">営業日設定</h3>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg mb-4 flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <p className="text-blue-700">
                  営業する曜日を選択してください。営業しない曜日は定休日として設定されます。
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {DAYS_OF_WEEK.map((day) => {
                  const dayId = day.id as DayOfWeek;
                  const isOpen = weekScheduleData.scheduleSettings[dayId].isOpen;

                  return (
                    <motion.div
                      key={day.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleDayToggle(dayId)}
                      className={`
                          cursor-pointer p-3 rounded-lg border-2 transition-all
                          ${
                            isOpen
                              ? `${day.color} border-current shadow-sm`
                              : 'bg-gray-100 border-gray-200 text-gray-500'
                          }
                        `}
                    >
                      <div className="flex flex-col items-start justify-between">
                        <span className="font-semibold">{day.week}</span>
                        {isOpen ? (
                          <div className="flex items-center gap-1 text-xs">
                            <Check className="h-4 w-4" />
                            <span>営業日</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs">
                            <X className="h-4 w-4" />
                            <span>定休日</span>
                          </div>
                        )}
                      </div>

                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 text-sm"
                        >
                          {weekScheduleData.scheduleSettings[dayId].startHour} ~{' '}
                          {weekScheduleData.scheduleSettings[dayId].endHour}
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
            <motion.div variants={itemVariants}>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">営業時間設定</h3>
              </div>

              <Tabs value={scheduleTab} onValueChange={setScheduleTab} className="w-full">
                <TabsList className="mb-4 p-1 rounded-lg">
                  <TabsTrigger value="common">
                    <Settings2 className="h-4 w-4 mr-2" />
                    共通設定
                  </TabsTrigger>
                  <TabsTrigger value="individual">
                    <Calendar className="h-4 w-4 mr-2" />
                    曜日ごとの設定
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="common">
                  <div className="flex items-center gap-2 mb-6">
                    <Switch
                      checked={weekScheduleData.useCommonHours}
                      onCheckedChange={handleUseCommonHoursChange}
                      className="data-[state=checked]:bg-blue-600"
                    />
                    <Label className="font-medium cursor-pointer">
                      すべての営業日に共通の営業時間を設定する
                    </Label>
                  </div>

                  {weekScheduleData.useCommonHours && (
                    <div>
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center">
                          <Clock3 className="mr-2 h-5 w-5 text-blue-600" />
                          <span className="font-medium">営業時間</span>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                          <Select
                            value={weekScheduleData.commonStartHour}
                            onValueChange={handleCommonStartHourChange}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue placeholder="開始時間" />
                            </SelectTrigger>
                            <SelectContent>
                              <ScrollArea className="h-60">
                                {timeOptions.map((time) => (
                                  <SelectItem key={`common-open-${time}`} value={time}>
                                    {time}
                                  </SelectItem>
                                ))}
                              </ScrollArea>
                            </SelectContent>
                          </Select>

                          <span className="text-lg font-semibold">〜</span>

                          <Select
                            value={weekScheduleData.commonEndHour}
                            onValueChange={handleCommonEndHourChange}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue placeholder="終了時間" />
                            </SelectTrigger>
                            <SelectContent>
                              <ScrollArea className="h-60">
                                {commonEndHourOptions.length > 0 ? (
                                  commonEndHourOptions.map((time) => (
                                    <SelectItem key={`common-close-${time}`} value={time}>
                                      {time}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                    開始時間より後の時間を選択できます
                                  </div>
                                )}
                              </ScrollArea>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="mt-4 p-3 bg-white rounded border border-blue-200 text-sm text-blue-700">
                        <div className="flex items-start gap-2">
                          <InfoIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <div>
                            すべての営業日に同じ営業時間が適用されます。曜日ごとに個別の時間を設定する場合は、共通設定をオフにしてください。
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="individual">
                  <motion.div variants={fadeInVariants} initial="hidden" animate="visible">
                    {activeDays.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {DAYS_OF_WEEK.filter(
                          (day) => weekScheduleData.scheduleSettings[day.id as DayOfWeek].isOpen
                        ).map((day) => {
                          const dayId = day.id as DayOfWeek;
                          const daySetting = weekScheduleData.scheduleSettings[dayId];
                          // 各曜日ごとに、開始時間より後の終了時間オプションを取得
                          const endHourOptions = getEndHourOptions(daySetting.startHour);

                          return (
                            <div
                              key={dayId}
                              className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 border rounded-lg ${day.color}`}
                            >
                              <div className="flex flex-col justify-between w-full">
                                <div className="font-semibold min-w-24 mb-1">{day.week}</div>

                                <div className="flex items-center gap-2">
                                  <Select
                                    value={daySetting.startHour}
                                    onValueChange={(value) =>
                                      updateDaySchedule(dayId, 'startHour', value)
                                    }
                                  >
                                    <SelectTrigger className="w-28">
                                      <SelectValue placeholder="開始時間" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <ScrollArea className="h-60">
                                        {timeOptions.map((time) => (
                                          <SelectItem key={`open-${dayId}-${time}`} value={time}>
                                            {time}
                                          </SelectItem>
                                        ))}
                                      </ScrollArea>
                                    </SelectContent>
                                  </Select>

                                  <span className="text-lg ">〜</span>

                                  <Select
                                    value={daySetting.endHour}
                                    onValueChange={(value) =>
                                      updateDaySchedule(dayId, 'endHour', value)
                                    }
                                  >
                                    <SelectTrigger className="w-28">
                                      <SelectValue placeholder="終了時間" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <ScrollArea className="h-60">
                                        {endHourOptions.length > 0 ? (
                                          endHourOptions.map((time) => (
                                            <SelectItem key={`close-${dayId}-${time}`} value={time}>
                                              {time}
                                            </SelectItem>
                                          ))
                                        ) : (
                                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                            開始時間より後の時間を選択できます
                                          </div>
                                        )}
                                      </ScrollArea>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-gray-50 text-center">
                        <Coffee className="h-12 w-12 text-gray-400 mb-3" />
                        <p className="text-gray-500 mb-2">営業日が設定されていません</p>
                        <p className="text-sm text-gray-400">
                          営業日を選択すると、時間設定が表示されます;
                        </p>
                      </div>
                    )}
                  </motion.div>
                </TabsContent>
              </Tabs>
            </motion.div>
          </motion.div>

          <motion.div className="mt-8 flex justify-end items-center gap-3" variants={itemVariants}>
            <AnimatePresence>
              {showToast && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center text-green-600"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  設定を保存しました
                </motion.div>
              )}
            </AnimatePresence>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="submit"
                    size="lg"
                    className="min-w-[120px]"
                    onClick={handleSubmit(onSubmit)}
                    disabled={isSaving}
                  >
                    {isSaving ? (
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
                </TooltipTrigger>
                <TooltipContent>
                  <p>営業日と営業時間の設定を保存します</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// 情報アイコンコンポーネント
const InfoIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);
