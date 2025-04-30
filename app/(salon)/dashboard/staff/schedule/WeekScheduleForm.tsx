'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Id } from '@/convex/_generated/dataModel';
import { useRouter } from 'next/navigation';
import { handleErrorToMsg } from '@/lib/error';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Clock,
  Calendar,
  Save,
  Clock3,
  Loader2,
  Coffee,
  Settings2,
  X,
  Check,
  CalendarClock,
} from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { useQuery, useMutation } from 'convex/react'
import { useSalon } from '@/hooks/useSalon'
import { Loading } from '@/components/common'
import { useZodForm } from '@/hooks/useZodForm'
import { z } from 'zod'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'

// dayOfWeekTypeの値を定義（エラー修正用）
const DAY_OF_WEEK_VALUES = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

const staffScheduleConfigSchema = z.object({
  staffId: z.string().optional(),
  dayOfWeek: z.enum(DAY_OF_WEEK_VALUES).optional(),
  isOpen: z.boolean().optional(),
  startHour: z.string().optional(),
  endHour: z.string().optional(),
})

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
    color: 'bg-blue-50 border-blue-200 text-blue-700',
  },
  {
    id: 'sunday',
    week: '日曜日',
    shortWeek: '日',
    color: 'bg-blue-50 border-blue-200 text-blue-700',
  },
]

// サロン曜日スケジュールの型定義
export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

// 各曜日の営業時間設定
export interface DaySchedule {
  isOpen: boolean
  startHour: string
  endHour: string
  scheduleId?: string // 既存レコードのID
}

// 曜日スケジュールデータ
export interface WeekScheduleData {
  // 各曜日の設定
  scheduleSettings: Record<DayOfWeek, DaySchedule>
  // 共通設定
  useCommonHours: boolean
  commonStartHour: string
  commonEndHour: string
}

const defaultScheduleHour = { startHour: '09:00', endHour: '17:00' }


export default function WeekHourScheduleForm({ staffId }: { staffId: Id<'staff'> }) {
  const { salonId } = useSalon();
  // 横スクロール可否判定用
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrollable, setIsScrollable] = useState(false);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const updateScrollable = () => {
      setIsScrollable(el.scrollWidth > el.clientWidth);
    };
    updateScrollable(); // 初回判定
    el.addEventListener('scroll', updateScrollable);
    window.addEventListener('resize', updateScrollable);
    return () => {
      el.removeEventListener('scroll', updateScrollable);
      window.removeEventListener('resize', updateScrollable);
    };
  }, []);
  const [isSaving, setIsSaving] = useState(false);
  const [scheduleTab, setScheduleTab] = useState('common');
  const router = useRouter();
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
  const staffWeekSchedules = useQuery(api.schedule.staff_week_schedule.query.getBySalonAndStaffId, {
    salonId: salonId as Id<'salon'>,
    staffId: staffId as Id<'staff'>,
  });

  const salonWeekSchedules = useQuery(api.schedule.salon_week_schedule.query.getAllBySalonId, {
    salonId: salonId as Id<'salon'>,
  });

  const updateWeekSchedule = useMutation(
    api.schedule.staff_week_schedule.mutation.updateWeekSchedule
  );

  const { handleSubmit } = useZodForm(staffScheduleConfigSchema);

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

  // staffIdが変更されたときにスケジュールをリセット
  useEffect(() => {
    setWeekScheduleData({
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
  }, [staffId]);

  // DBから取得したスケジュールデータを初期表示に反映
  useEffect(() => {
    if (staffWeekSchedules && Array.isArray(staffWeekSchedules) && staffWeekSchedules.length > 0) {
      // 初期データロード時のみ反映するために、scheduleIdが設定されていない場合のみ更新する
      const shouldUpdateSchedule = Object.values(weekScheduleData.scheduleSettings).some(
        (setting) => !setting.scheduleId
      );

      if (shouldUpdateSchedule) {
        const newScheduleSettings = { ...weekScheduleData.scheduleSettings };
        let earliestStartHour = '24:00'; // 最も早い開始時間を追跡
        let latestEndHour = '00:00'; // 最も遅い終了時間を追跡
        staffWeekSchedules.forEach((schedule) => {
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
              if (startHour < earliestStartHour) {
                earliestStartHour = startHour;
              }
              if (endHour > latestEndHour) {
                latestEndHour = endHour;
              }
            }
          }
        });

        setWeekScheduleData((prev) => ({
          ...prev,
          scheduleSettings: newScheduleSettings,
        }));
      }
    }
  }, [staffWeekSchedules]); // eslint-disable-line react-hooks/exhaustive-deps

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
        staffId: staffId as Id<'staff'>,
        scheduleSettings: cleanedScheduleSettings,
      });

      // 成功メッセージ
      toast.success('営業時間を更新しました');
      router.refresh();
    } catch (err) {
      toast.error(handleErrorToMsg(err));
    } finally {
      setIsSaving(false);
    }
  }, [weekScheduleData, salonId, updateWeekSchedule, staffId, router]);

  // ローディング状態
  if (staffWeekSchedules === undefined) {
    return <Loading />;
  }

  return (
    <div>
      <Card className="border shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 border-b">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-blue-500" />
            <CardTitle>スタッフの勤務日・勤務時間設定</CardTitle>
          </div>
          <CardDescription>
            スタッフの勤務日と勤務時間を設定します。定休日には予約を受け付けません。
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6">
          <div className="space-y-8">
            {/* 営業日設定 */}
            <div>
              <p className="text-sm mb-2 font-semibold">サロンの営業日</p>
              {/* 横スクロール可能リスト  */}
              <div className="relative mb-4">
                <div
                  ref={scrollContainerRef}
                  className="flex overflow-x-auto w-full items-start gap-2 bg-white rounded-lg pr-6"
                >
                  {DAYS_OF_WEEK.map((day) => {
                    const schedule = salonWeekSchedules?.find(
                      (schedule) => schedule.dayOfWeek === day.id
                    );
                    return (
                      <div
                        key={day.id}
                        className="flex flex-col min-w-24 justify-center items-center gap-2 text-xs p-1"
                      >
                        <span className="font-semibold">{day.week}</span>
                        {schedule?.isOpen ? (
                          <span className="text-green-600 bg-green-50 rounded-full px-2 py-1">
                            営業日
                          </span>
                        ) : (
                          <span className="text-red-600 bg-red-50 rounded-full px-2 py-1">
                            定休日
                          </span>
                        )}
                        {schedule?.isOpen && (
                          <span className="text-gray-500">
                            {schedule?.startHour} ~ {schedule?.endHour}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 右端グラデーション（スクロールヒント） */}
                {isScrollable && (
                  <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white/90 to-transparent" />
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {DAYS_OF_WEEK.filter((day) =>
                  salonWeekSchedules?.some(
                    (schedule) => schedule.dayOfWeek === day.id && schedule.isOpen === true
                  )
                ).map((day) => {
                  const dayId = day.id as DayOfWeek;
                  const isOpen = weekScheduleData.scheduleSettings[dayId].isOpen;

                  return (
                    <div
                      key={day.id}
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
                        <span className="font-semibold mb-1">{day.week}</span>
                        {isOpen ? (
                          <div className="flex items-center gap-1 text-xs">
                            <Check className="h-4 w-4" />
                            <span>勤務日</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs">
                            <X className="h-4 w-4" />
                            <span>休日</span>
                          </div>
                        )}
                      </div>

                      {isOpen && (
                        <div className="mt-2 text-sm font-bold ">
                          {weekScheduleData.scheduleSettings[dayId].startHour} ~{' '}
                          {weekScheduleData.scheduleSettings[dayId].endHour}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">勤務時間設定</h3>
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
                      すべての勤務日に共通の勤務時間を設定する
                    </Label>
                  </div>

                  {weekScheduleData.useCommonHours && (
                    <div>
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center">
                          <Clock3 className="mr-2 h-5 w-5 text-blue-600" />
                          <span className="font-medium">勤務時間</span>
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
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="individual">
                  <div>
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
                        <p className="text-gray-500 mb-2">勤務日が設定されていません</p>
                        <p className="text-sm text-gray-400">
                          勤務日を選択すると、時間設定が表示されます;
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <div className="mt-8 flex justify-end items-center gap-3">
            <Button
              type="submit"
              size="lg"
              className="min-w-[120px]"
              onClick={handleSubmit(onSubmit)}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  勤務時間を保存
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}