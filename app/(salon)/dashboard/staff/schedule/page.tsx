'use client';

import { Button } from '@/components/ui/button';
import DashboardSection from '@/components/common/DashboardSection';
import { useSalon } from '@/hooks/useSalon';
import { api } from '@/convex/_generated/api';
import { usePaginatedQuery, useMutation } from 'convex/react';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import WeekScheduleForm from './WeekScheduleForm';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { convertHourToUnixTimestamp } from '@/lib/schedule';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { Id } from '@/convex/_generated/dataModel';
import { CalendarMultiSelect } from '@/components/common';
import { fetchQuery } from 'convex/nextjs';
import { format, compareAsc } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2 } from 'lucide-react';
import { handleErrorToMsg } from '@/lib/error';
// 開始時間と終了時間を含む日付の型定義
type DateWithTimes = {
  date: Date;
  startTime?: string;
  endTime?: string;
  notes?: string;
};

// 全時刻の配列 (10分刻み)
const timeOptions = Array.from({ length: 24 }).flatMap((_, hour) =>
  [0, 10, 20, 30, 40, 50].map((minute) => {
    const hh = String(hour).padStart(2, '0');
    const mm = String(minute).padStart(2, '0');
    return `${hh}:${mm}`;
  })
);

// "HH:mm" 形式を分に変換
const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const pageSize: number = 20;

export default function StaffSchedulePage() {
  const { salonId } = useSalon();
  const [selectedStaffId, setSelectedStaffId] = useState<Id<'staff'> | null>(null);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [isAllDay, setIsAllDay] = useState<{ [key: string]: boolean }>({});
  // 日付と時間情報を保持する状態
  const [dateTimeSettings, setDateTimeSettings] = useState<DateWithTimes[]>([]);

  const { results: staffs } = usePaginatedQuery(
    api.staff.core.query.getStaffListBySalonId,
    salonId ? { salonId } : 'skip',
    { initialNumItems: pageSize }
  );
  // 追加：週間設定用 state

  const upsertSchedules = useMutation(api.schedule.staff_exception.mutation.upsertSchedules);

  // 時間設定を含めたスケジュール保存処理
  const handleUpsertSchedules = async (): Promise<void> => {
    // 終日でない場合、開始時間と終了時間の設定を必須にする
    for (const item of dateTimeSettings) {
      const allDay = isAllDay[item.date.toISOString()];
      if (!allDay && (!item.startTime || !item.endTime)) {
        toast.error('終日の予定ではない場合は開始時間と終了時間を設定してください');
        return;
      }
    }
    try {
      await upsertSchedules({
        staffId: selectedStaffId as Id<'staff'>,
        salonId: salonId as Id<'salon'>,
        dates: dateTimeSettings.map((item) => ({
          date: format(item.date, 'yyyy-MM-dd'),
          startTime_unix: isAllDay[item.date.toISOString()]
            ? convertHourToUnixTimestamp('00:00', item.date.toISOString())!
            : item.startTime
              ? convertHourToUnixTimestamp(item.startTime, item.date.toISOString())!
              : 0,
          endTime_unix: isAllDay[item.date.toISOString()]
            ? convertHourToUnixTimestamp('00:00', item.date.toISOString())!
            : item.endTime
              ? convertHourToUnixTimestamp(item.endTime, item.date.toISOString())!
              : 0,
          notes: item.notes,
          isAllDay: isAllDay[item.date.toISOString()] ? true : false,
        })),
        type: 'holiday',
      });
      toast.success('スタッフの予定を保存しました');
    } catch (error) {
      toast.error(handleErrorToMsg(error));
    }
  };

  const handleNoteChange = (index: number, value: string): void => {
    const newSettings = [...dateTimeSettings];
    newSettings[index].notes = value;
    setDateTimeSettings(newSettings);
  };

  // 選択済みスケジュールを削除
  const handleDelete = (index: number): void => {
    // 日付・詳細設定両方から該当行を削除
    const newDateTimeSettings = [...dateTimeSettings];
    newDateTimeSettings.splice(index, 1);
    setDateTimeSettings(newDateTimeSettings);

    const newSelectedDates = [...selectedDates];
    newSelectedDates.splice(index, 1);
    setSelectedDates(newSelectedDates);
  };

  // 日付選択ごとに追加・削除を差分で反映する
  useEffect(() => {
    setIsAllDay((prev) => {
      const next = { ...prev };
      // 新しく追加された日付には false をセット
      selectedDates.forEach((date) => {
        const iso = date.toISOString();
        if (!(iso in next)) {
          next[iso] = false;
        }
      });
      // 選択解除された日付のキーを削除
      Object.keys(next).forEach((key) => {
        if (!selectedDates.find((d) => d.toISOString() === key)) {
          delete next[key];
        }
      });
      return next;
    });

    setDateTimeSettings((prev) => {
      const prevMap = new Map(prev.map((s) => [format(s.date, 'yyyy-MM-dd'), s]));
      const nextSettings: DateWithTimes[] = selectedDates.map((date) => {
        const key = format(date, 'yyyy-MM-dd');
        if (prevMap.has(key)) {
          return prevMap.get(key)!;
        }
        // 新規日付は時間未設定で追加
        return { date, startTime: undefined, endTime: undefined, notes: undefined };
      });
      return nextSettings;
    });
  }, [selectedDates]);

  // スタッフ選択時の既存スケジュール取得処理
  useEffect(() => {
    if (salonId && selectedStaffId && staffs.length > 0) {
      const fetchStaffSchedule = async (): Promise<void> => {
        const staffSchedule = await fetchQuery(
          api.schedule.staff_exception.query.findBySalonAndStaffId,
          {
            salonId: salonId as Id<'salon'>,
            staffId: selectedStaffId as Id<'staff'>,
          }
        );

        // 重複する日付を排除した設定を作成
        const map = new Map<string, DateWithTimes>();
        staffSchedule.forEach((schedule) => {
          const startDate = new Date(schedule.startTime_unix!);
          const endDate = new Date(schedule.endTime_unix!);
          const iso = startDate.toISOString();
          if (!map.has(iso)) {
            map.set(iso, {
              date: startDate,
              startTime: format(startDate, 'HH:mm'),
              endTime: format(endDate, 'HH:mm'),
              notes: schedule.notes,
            });
          }
        });
        const uniqueSettings = Array.from(map.values()).sort((a, b) => compareAsc(a.date, b.date));
        // fetched schedules include isAllDay, so initialize the all-day map
        const allDayMap: { [key: string]: boolean } = {};
        staffSchedule.forEach((schedule) => {
          const iso = new Date(schedule.startTime_unix!).toISOString();
          allDayMap[iso] = !!schedule.isAllDay;
        });

        console.log('staffSchedule: ', staffSchedule);
        setIsAllDay(allDayMap);
        setSelectedDates(uniqueSettings.map((s) => s.date));
        setDateTimeSettings(uniqueSettings);
      };

      fetchStaffSchedule();
    } else {
      setSelectedDates([]);
      setDateTimeSettings([]);
    }
  }, [selectedStaffId, salonId, staffs]);

  // 時間設定ハンドラ（開始時刻選択時は終了時刻を調整）
  const handleTimeChange = (index: number, field: 'startTime' | 'endTime', value: string): void => {
    const newSettings = [...dateTimeSettings];
    if (field === 'startTime') {
      newSettings[index].startTime = value;
      // 開始時刻以降の最初の時刻を終了時刻に設定
      const nextOption = timeOptions.find((t) => timeToMinutes(t) > timeToMinutes(value));
      newSettings[index].endTime = nextOption || value;
    } else {
      newSettings[index].endTime = value;
    }
    setDateTimeSettings(newSettings);
  };

  return (
    <DashboardSection
      title="スタッフの勤務管理"
      backLink="/dashboard/staff"
      backLinkTitle="スタッフ一覧"
    >
      <div className="space-y-3">
        <div className="flex flex-col justify-end items-end gap-2">
          <div className="w-fit min-w-[180px]">
            <Label className="mb-2">予定を追加するスタッフ</Label>
            <Select
              value={selectedStaffId ?? ''}
              onValueChange={(value) => setSelectedStaffId(value as Id<'staff'>)}
            >
              <SelectTrigger>
                <SelectValue placeholder="スタッフを選択" />
              </SelectTrigger>
              <SelectContent>
                {staffs.map((staff) => (
                  <SelectItem key={staff._id} value={staff._id}>
                    {staff.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Tabs defaultValue="week">
            <TabsList className="mb-4 w-full max-w-[500px]">
              <TabsTrigger value="week" className="w-full">
                週間スケジュール設定
              </TabsTrigger>
              <TabsTrigger value="holiday" className="w-full">
                スケジュール作成
              </TabsTrigger>
            </TabsList>
            <TabsContent value="week">
              {selectedStaffId ? (
                <WeekScheduleForm staffId={selectedStaffId} />
              ) : (
                <div className="flex justify-start items-center h-32 p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-500 text-sm">先にスタッフを選択してください。</p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="holiday">
              <div className="flex flex-col gap-4">
                <h4 className="text-sm font-semibold">
                  休日や予定を追加します。スケジュールの範囲内での予約の受付を停止します。
                </h4>
                <div>
                  <CalendarMultiSelect
                    fromDate={new Date()}
                    disabled={!selectedStaffId}
                    selectedDates={selectedDates}
                    onDatesChangeAction={(dates) => {
                      // 日付選択時に日付をソートしておく
                      const sortedDates = [...dates].sort(compareAsc);
                      setSelectedDates(sortedDates);
                    }}
                  />
                </div>

                {/* 選択した日付ごとの時間設定セクション */}
                {dateTimeSettings.length > 0 && (
                  <Card>
                    <CardContent className="pt-6">
                      <h3 className="text-base font-semibold mb-4">作成されたスケジュール</h3>
                      <ScrollArea className="max-h-[400px] overflow-y-auto pr-4">
                        <div className="space-y-4">
                          {dateTimeSettings.map((setting, index) => (
                            <div
                              key={index}
                              className="grid grid-cols-1 md:grid-cols-[1fr,2fr,2fr] gap-4 items-center border-b pb-4"
                            >
                              <div className="flex gap-2 items-center">
                                <span className="text-base font-bold">
                                  {format(setting.date, 'M月d日(EEE)', { locale: ja })}
                                </span>
                              </div>
                              <div className="flex flex-col gap-2 items-start">
                                <div className="flex gap-2 items-center">
                                  <Label className="text-xs">終日</Label>
                                  <Switch
                                    checked={isAllDay[setting.date.toISOString()]}
                                    onCheckedChange={() =>
                                      setIsAllDay({
                                        ...isAllDay,
                                        [setting.date.toISOString()]:
                                          !isAllDay[setting.date.toISOString()],
                                      })
                                    }
                                  />
                                </div>

                                <div
                                  className={`flex gap-2 w-full ${
                                    isAllDay[setting.date.toISOString()]
                                      ? 'opacity-50 pointer-events-none'
                                      : ''
                                  }`}
                                >
                                  <div className="w-full">
                                    <Label
                                      htmlFor={`start-time-${index}`}
                                      className="mb-1 block text-xs"
                                    >
                                      開始時間
                                    </Label>

                                    <Select
                                      value={setting.startTime ?? undefined}
                                      onValueChange={(value) =>
                                        handleTimeChange(index, 'startTime', value)
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="開始時間" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {timeOptions.map((time) => (
                                          <SelectItem key={time} value={time}>
                                            {time}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="w-full">
                                    <Label
                                      htmlFor={`end-time-${index}`}
                                      className="mb-1 block text-xs"
                                    >
                                      終了時間
                                    </Label>
                                    <Select
                                      value={setting.endTime}
                                      onValueChange={(value) =>
                                        handleTimeChange(index, 'endTime', value)
                                      }
                                      disabled={!setting.startTime}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="終了時間" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {timeOptions
                                          .filter(
                                            (t) =>
                                              timeToMinutes(t) >
                                              timeToMinutes(setting.startTime ?? '')
                                          )
                                          .map((time) => (
                                            <SelectItem key={time} value={time}>
                                              {time}
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </div>
                              <div className="w-full p-1">
                                <div className="flex justify-between items-center">
                                  <p className="text-sm font-medium">備考</p>
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    className="scale-75"
                                    onClick={() => handleDelete(index)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                                <Textarea
                                  id={`note-${index}`}
                                  className="w-full"
                                  value={setting.notes}
                                  onChange={(e) => handleNoteChange(index, e.target.value)}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
              </div>
              <div className="flex justify-end mt-4">
                <Button
                  onClick={handleUpsertSchedules}
                  disabled={!selectedStaffId}
                  className="w-full md:w-auto"
                >
                  予定を保存
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardSection>
  );
}
