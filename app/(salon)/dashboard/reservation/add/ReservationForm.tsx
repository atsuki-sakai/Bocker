// 予約作成画面
// /app/(salon)/dashboard/reservation/add/ReservationForm.tsx

'use client';

import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { ja } from 'date-fns/locale';
import { getDayOfWeek, formatJpTime } from '@/lib/schedule';
import { PaymentMethod } from '@/services/convex/shared/types/common';
// 入力値を数値または undefined に変換するプリプロセス関数
const preprocessNumber = (val: unknown) => {
  if (typeof val === 'string' && val.trim() === '') return undefined;
  if (typeof val === 'string') return Number(val);
  return val;
};
// 空文字を undefined に変換するプリプロセス関数（enum 用）
const preprocessEmptyString = (val: unknown) => {
  if (typeof val === 'string' && val.trim() === '') return undefined;
  return val;
};
// カンマ区切り文字列を文字列配列に変換するプリプロセス関数（optionIds 用）
const preprocessStringArray = (val: unknown) => {
  if (typeof val === 'string' && val.trim() === '') return undefined;
  if (typeof val === 'string')
    return val
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  return val;
};

import * as React from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useZodForm } from '@/hooks/useZodForm';
import { useSalon } from '@/hooks/useSalon';
import { ZodTextField } from '@/components/common';
import { Loading } from '@/components/common';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { DayOfWeek } from '@/services/convex/shared/types/common';
import { toast } from 'sonner';
import { useMutation } from 'convex/react';
import {
  RESERVATION_STATUS_VALUES,
  PAYMENT_METHOD_VALUES,
} from '@/services/convex/shared/types/common';
const schemaReservation = z.object({
  customerId: z.string().optional(), // 顧客ID
  staffId: z.string().optional(), // スタッフID
  staffName: z.string().optional(), // スタッフ名
  menuIds: z.preprocess(preprocessStringArray, z.array(z.string())).optional(), // メニューID（複数選択可能に変更）
  salonId: z.string().optional(), // サロンID
  optionIds: z.preprocess(preprocessStringArray, z.array(z.string())).optional(), // オプションID（カンマ区切り → 配列）
  unitPrice: z.preprocess(preprocessNumber, z.number()).optional(), // 単価
  totalPrice: z.preprocess(preprocessNumber, z.number()).optional(), // 合計金額
  status: z.preprocess(preprocessEmptyString, z.enum(RESERVATION_STATUS_VALUES)).optional(), // 予約ステータス
  startTime_unix: z.preprocess(preprocessNumber, z.number()).optional(), // 開始時間 UNIXタイム
  endTime_unix: z.preprocess(preprocessNumber, z.number()).optional(), // 終了時間 UNIXタイム
  usePoints: z.preprocess(preprocessNumber, z.number()).optional(), // 使用ポイント数
  couponId: z.string().optional(), // クーポンID
  featuredHairimgPath: z.string().optional(), // 顧客が希望する髪型の画像ファイルパス
  notes: z.string().optional(), // 備考
  paymentMethod: z.preprocess(preprocessEmptyString, z.enum(PAYMENT_METHOD_VALUES)).optional(), // 支払い方法
});

import { usePaginatedQuery, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fetchQuery } from 'convex/nextjs';
import { Id } from '@/convex/_generated/dataModel';
import { Textarea } from '@/components/ui/textarea';
import { Gender } from '@/services/convex/shared/types/common';
import { Checkbox } from '@/components/ui/checkbox';
type AvailableStaff = {
  _id: Id<'staff'>;
  name: string;
  staffName: string;
  age: number;
  email: string;
  gender: Gender;
  description: string;
  imgPath: string;
  extraCharge: number;
  priority: number;
};

export default function ReservationForm() {
  const { salonId, salon } = useSalon();
  const router = useRouter();
  // 複数選択に対応するためにstateを配列に変更
  const [selectedMenuIds, setSelectedMenuIds] = useState<Id<'menu'>[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<Id<'staff'> | null>(null);
  const [selectdate, setSelectDate] = useState<Date | null>(null);
  const [staffSchedule, setStaffSchedule] = useState<{
    schedules: {
      type: 'holiday' | 'other' | 'reservation' | undefined;
      date: string | undefined;
      startTime_unix: number | undefined;
      endTime_unix: number | undefined;
      isAllDay: boolean | undefined;
    }[];
    week: {
      dayOfWeek: DayOfWeek;
      isOpen: boolean;
      startHour: string;
      endHour: string;
    } | null;
  } | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<Id<'salon_option'>[]>([]);
  const [availableStaff, setAvailableStaff] = useState<AvailableStaff[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState<boolean>(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const scheduleConfig = useQuery(
    api.salon.schedule.query.findBySalonId,
    salonId
      ? {
          salonId: salonId,
        }
      : 'skip'
  );

  const { results: menus } = usePaginatedQuery(
    api.menu.core.query.listBySalonId,
    salonId
      ? {
          salonId: salonId,
        }
      : 'skip',
    {
      initialNumItems: 100,
    }
  );

  const { results: options } = usePaginatedQuery(
    api.option.query.list,
    salonId
      ? {
          salonId: salonId,
        }
      : 'skip',
    { initialNumItems: 100 }
  );

  const salonWeekSchedules = useQuery(
    api.schedule.salon_week_schedule.query.getAllBySalonId,
    salonId
      ? {
          salonId: salonId,
        }
      : 'skip'
  );

  const salonExceptionSchedules = useQuery(
    api.schedule.salon_exception.query.displayExceptionSchedule,
    salonId
      ? {
          salonId: salonId,
          take: 8,
          dateString: new Date().toISOString().split('T')[0],
        }
      : 'skip'
  );
  console.log('salonExceptionSchedules: ', salonExceptionSchedules);
  const createReservation = useMutation(api.reservation.mutation.create);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useZodForm(schemaReservation);

  // 時間スロットの状態を追加
  const [availableTimeSlots, setAvailableTimeSlots] = useState<
    { startTime: number; endTime: number; startTimeFormatted: string; endTimeFormatted?: string }[]
  >([]);

  useEffect(() => {
    if (!salonId) return;
    reset({
      customerId: undefined, // 顧客ID
      staffId: undefined, // スタッフID
      staffName: undefined, // スタッフ名
      menuIds: [], // メニューID（複数）
      salonId: salonId, // サロンID
      status: 'pending', // 予約ステータス
      optionIds: [], // オプションID
      unitPrice: undefined, // 単価
      totalPrice: undefined, // 合計金額
      startTime_unix: undefined, // 開始時間 UNIXタイム
      endTime_unix: undefined, // 終了時間 UNIXタイム
      usePoints: undefined, // 使用ポイント数
      couponId: undefined, // クーポンID
      featuredHairimgPath: undefined, // 顧客が希望する髪型の画像ファイルパス
      notes: undefined, // 備考
      paymentMethod: 'cash', // 支払い方法
    });
  }, [salonId, reset]);

  useEffect(() => {
    if (selectedMenuIds.length === 0 || !salonId) {
      setAvailableStaff([]);
      return;
    }

    const getAvailableStaffForAllMenus = async () => {
      setIsLoadingStaff(true);
      try {
        // 最初のメニューに対応するスタッフを取得
        const firstMenuStaffs = (await fetchQuery(api.staff.core.query.findAvailableStaffByMenu, {
          salonId: salonId,
          menuId: selectedMenuIds[0],
        })) as AvailableStaff[];

        if (selectedMenuIds.length === 1) {
          // 単一メニューの場合はそのまま設定
          setAvailableStaff(firstMenuStaffs);
        } else {
          // 複数メニューの場合は、各メニューに対応するスタッフを取得して共通するスタッフを抽出
          let eligibleStaff = [...firstMenuStaffs];

          // 2番目以降のメニューについてループ
          for (let i = 1; i < selectedMenuIds.length; i++) {
            const menuId = selectedMenuIds[i];
            const menuStaffs = (await fetchQuery(api.staff.core.query.findAvailableStaffByMenu, {
              salonId: salonId,
              menuId: menuId,
            })) as AvailableStaff[];

            // 共通するスタッフのみをフィルタリング
            eligibleStaff = eligibleStaff.filter((staff) =>
              menuStaffs.some((menuStaff) => menuStaff._id === staff._id)
            );

            // 共通するスタッフがいない場合は早期リターン
            if (eligibleStaff.length === 0) break;
          }

          setAvailableStaff(eligibleStaff);
        }
      } catch (error) {
        console.error('スタッフの取得中にエラーが発生しました:', error);
        setAvailableStaff([]);
      } finally {
        setIsLoadingStaff(false);
      }
    };

    getAvailableStaffForAllMenus();
  }, [selectedMenuIds, salonId]);

  useEffect(() => {
    console.log('selectdate: ', typeof selectdate);
    if (selectedStaffId && salonId && selectdate) {
      const getExceptionSchedule = async () => {
        const schedules = await fetchQuery(api.staff.core.query.findSchedule, {
          salonId: salonId,
          staffId: selectedStaffId,
          dayOfWeek: getDayOfWeek(selectdate) as DayOfWeek,
        });
        if (schedules && schedules.week && schedules.week.dayOfWeek !== undefined) {
          setStaffSchedule({
            schedules: schedules.schedules,
            week: {
              dayOfWeek: schedules.week.dayOfWeek as DayOfWeek,
              isOpen: !!schedules.week.isOpen,
              startHour: schedules.week.startHour ?? '',
              endHour: schedules.week.endHour ?? '',
            },
          });

          // 終日予約を受け付けない日
          const allDaySchedules = schedules.schedules.filter(
            (schedule) => schedule.isAllDay || schedule.startTime_unix === schedule.endTime_unix
          );

          console.log('allDaySchedules: ', allDaySchedules);
        } else {
          setStaffSchedule({
            schedules: schedules ? schedules.schedules : [],
            week: null,
          });
        }
      };
      getExceptionSchedule();
    }
  }, [selectedStaffId, salonId, selectdate]);

  // 合計所要時間 (メニューとオプションの timeToMin を合算)
  const totalTimeMinutes = React.useMemo(() => {
    const menuTime = selectedMenuIds.reduce((sum, id) => {
      const menu = menus.find((m) => m._id === id);
      return sum + (menu?.timeToMin ?? 0);
    }, 0);
    const optionTime = selectedOptionIds.reduce((sum, id) => {
      const option = options.find((o) => o._id === id);
      return sum + (option?.timeToMin ?? 0);
    }, 0);
    return menuTime + optionTime;
  }, [selectedMenuIds, menus, selectedOptionIds, options]);

  // 選択されたメニューの合計金額 (salePrice が 0 か未定義の場合は unitPrice)
  const menuTotalPrice = React.useMemo(() => {
    return selectedMenuIds.reduce((sum, id) => {
      const menu = menus.find((m) => m._id === id);
      if (!menu) return sum;
      const price = menu.salePrice && menu.salePrice > 0 ? menu.salePrice : (menu.unitPrice ?? 0);
      return sum + price;
    }, 0);
  }, [selectedMenuIds, menus]);

  // 選択されたオプションの合計金額 (salePrice が 0 か未定義の場合は unitPrice)
  const optionTotalPrice = React.useMemo(() => {
    return selectedOptionIds.reduce((sum, id) => {
      const option = options.find((o) => o._id === id);
      if (!option) return sum;
      const price =
        option.salePrice && option.salePrice > 0 ? option.salePrice : (option.unitPrice ?? 0);
      return sum + price;
    }, 0);
  }, [selectedOptionIds, options]);

  // スタッフ指名料
  const extraChargePrice = React.useMemo(() => {
    return selectedStaffId
      ? (availableStaff.find((s) => s._id === selectedStaffId)?.extraCharge ?? 0)
      : 0;
  }, [selectedStaffId, availableStaff]);

  // 総合計金額をフォームの totalPrice にセット
  const totalPriceCalculated = menuTotalPrice + optionTotalPrice + extraChargePrice;
  useEffect(() => {
    setValue('totalPrice', totalPriceCalculated);
    setValue('unitPrice', menuTotalPrice);
  }, [setValue, totalPriceCalculated, menuTotalPrice, optionTotalPrice, extraChargePrice]);

  // 日付とスタッフの変更で空き時間を取得
  useEffect(() => {
    const getAvailableTimeSlots = async () => {
      if (selectedStaffId && salonId && selectdate && totalTimeMinutes) {
        // 日付をYYYY-MM-DD形式に変換
        const formattedDate = format(selectdate, 'yyyy-MM-dd');
        console.log('API呼び出し - パラメータ:', {
          salonId,
          staffId: selectedStaffId,
          date: formattedDate,
          totalTimeToMin: totalTimeMinutes,
        });

        try {
          const result = await fetchQuery(api.reservation.query.getAvailableTimeSlots, {
            salonId: salonId,
            staffId: selectedStaffId,
            date: formattedDate, // ISO形式ではなくYYYY-MM-DD形式に変更
            totalTimeToMin: totalTimeMinutes,
          });

          console.log('API呼び出し結果:', result);

          if (result && result.timeSlots) {
            setAvailableTimeSlots(result.timeSlots);
          } else {
            setAvailableTimeSlots([]);
          }
        } catch (error) {
          console.error('空き時間取得エラー:', error);
          setAvailableTimeSlots([]);
        }
      } else {
        // 必要な情報が揃っていない場合は空にする
        setAvailableTimeSlots([]);
      }
    };
    getAvailableTimeSlots();
  }, [selectedStaffId, salonId, selectdate, totalTimeMinutes]);

  // メニュー選択を処理する関数
  const handleMenuToggle = (menuId: Id<'menu'>, checked: boolean) => {
    if (checked) {
      // 選択されたメニューを追加
      const newSelectedMenuIds = [...selectedMenuIds, menuId];
      setSelectedMenuIds(newSelectedMenuIds);
      setValue('unitPrice', menus.find((m) => m._id === menuId)?.unitPrice ?? 0);

      setValue('menuIds', newSelectedMenuIds);
    } else {
      // 選択解除されたメニューを削除
      const newSelectedMenuIds = selectedMenuIds.filter((id) => id !== menuId);
      setSelectedMenuIds(newSelectedMenuIds);
      setValue('menuIds', newSelectedMenuIds);
    }

    // メニュー変更時にスタッフ選択をリセット
    setSelectedStaffId(null);
    setValue('staffId', '');
  };

  // オプション選択を処理する関数
  const handleOptionToggle = (optionId: Id<'salon_option'>, checked: boolean) => {
    if (checked) {
      // 選択されたオプションを追加
      const newSelectedOptionIds = [...selectedOptionIds, optionId];
      setSelectedOptionIds(newSelectedOptionIds);
      setValue('optionIds', newSelectedOptionIds);
    } else {
      // 選択解除されたオプションを削除
      const newSelectedOptionIds = selectedOptionIds.filter((id) => id !== optionId);
      setSelectedOptionIds(newSelectedOptionIds);
      setValue('optionIds', newSelectedOptionIds);
    }
  };

  const onSubmit = async (data: z.infer<typeof schemaReservation>) => {
    console.log('submit: ', data);

    try {
      await createReservation({
        ...data,
        customerId: data.customerId as Id<'customer'>,
        salonId: salonId as Id<'salon'>,
        menuIds: data.menuIds as Id<'menu'>[],
        startTime_unix: data.startTime_unix as number,
        endTime_unix: data.endTime_unix as number,
        status: 'confirmed',
        unitPrice: data.unitPrice as number,
        staffId: data.staffId as Id<'staff'>,
        staffName: selectStaff?.name ?? undefined,
        couponId: data.couponId as Id<'coupon'>,
        usePoints: data.usePoints as number,
        notes: data.notes as string,
        paymentMethod: data.paymentMethod as PaymentMethod,
        totalPrice: data.totalPrice as number,
        optionIds: data.optionIds?.map((id) => id as Id<'salon_option'>),
      });
      toast.success('予約が完了しました');
      router.push('/dashboard/reservation');
    } catch (error) {
      console.error('予約作成エラー:', error);
      toast.error('予約作成に失敗しました');
    }
  };

  const selectMenu = menus.find((menu) => menu._id === selectedMenuIds[0]);
  const selectStaff = availableStaff.find((staff) => staff._id === selectedStaffId);
  const selectDate = selectdate;
  const selectOptions = options.filter((option) => selectedOptionIds.includes(option._id));

  console.log('selectMenu: ', selectMenu);
  console.log('selectStaff: ', selectStaff);
  console.log('selectDate: ', selectDate);
  console.log('selectOptions: ', selectOptions);
  console.log('staffSchedule.week: ', staffSchedule?.week);
  console.log('staffSchedule.schedules: ', staffSchedule?.schedules);

  const toDate = scheduleConfig?.reservationLimitDays
    ? new Date(
        new Date().setDate(new Date().getDate() + (scheduleConfig.reservationLimitDays ?? 30))
      )
    : undefined;

  if (!salon || !salonId) return <Loading />;

  return (
    <div className="container mx-auto relative">
      <form
        onSubmit={handleSubmit(onSubmit)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
            e.preventDefault();
          }
        }}
      >
        <div className="flex flex-col gap-4 my-6">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-slate-500 text-lg font-bold">1</p>
              <Label>予約するメニュー（複数選択可）</Label>
            </div>
            <div className="mt-2 space-y-2 border p-3 rounded-md">
              {menus.map((menu) => (
                <div key={menu._id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`menu-${menu._id}`}
                    checked={selectedMenuIds.includes(menu._id)}
                    onCheckedChange={(checked) => handleMenuToggle(menu._id, checked as boolean)}
                  />
                  <div className="flex items-start flex-col">
                    <label
                      htmlFor={`menu-${menu._id}`}
                      className="ml-1 inline-block text-sm tracking-wide font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {menu.name} / {menu.timeToMin} 分
                    </label>
                    <span className="inline-block text-xs text-slate-500">
                      {menu.salePrice ? (
                        <span className="inline-block -ml-1 text-xs text-slate-500 line-through scale-75">
                          ￥{menu.unitPrice}
                        </span>
                      ) : null}
                      <span className="inline-block">
                        ￥{menu.salePrice && menu.salePrice > 0 ? menu.salePrice : menu.unitPrice}
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {errors.menuIds && <p className="text-red-500 text-sm">{errors.menuIds.message}</p>}
          </div>
          {/* 選択されたメニュー表示 */}
          {selectedMenuIds.length > 0 && (
            <div className="bg-slate-50 p-3 rounded-md">
              <Label className="mb-2 block">選択中のメニュー</Label>
              <div className="flex flex-wrap gap-2">
                {selectedMenuIds.map((menuId) => {
                  const menu = menus.find((m) => m._id === menuId);
                  return menu ? (
                    <div
                      key={menuId}
                      className="bg-white px-3 py-1 rounded-md flex items-center gap-2 border"
                    >
                      <span className="text-xs">{menu.name}</span>
                      <button
                        type="button"
                        onClick={() => handleMenuToggle(menuId, false)}
                        className="text-slate-500 hover:text-slate-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}
          {isLoadingStaff ? (
            <div className="flex items-center justify-center p-4 bg-green-50 rounded-md">
              <Loader2 className="h-5 w-5 animate-spin mr-2 text-green-500" />
              <span className="text-green-500">スタッフを検索中...</span>
            </div>
          ) : selectedMenuIds.length > 0 && availableStaff.length > 0 ? (
            <div className="flex flex-col gap-2 my-3">
              <div className="flex items-center gap-2">
                <p className="text-slate-500 text-lg font-bold">2</p>
                <Label>施術するスタッフ</Label>
              </div>
              <Select
                value={watch('staffId') ?? ''}
                onValueChange={(value: string) => {
                  setValue('staffId', value);
                  setSelectedStaffId(value as Id<'staff'>);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="スタッフを選択" />
                </SelectTrigger>
                <SelectContent>
                  {availableStaff.map((staff) => (
                    <SelectItem key={staff._id} value={staff._id}>
                      <span>{staff.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.staffId && <p className="text-red-500 text-sm">{errors.staffId.message}</p>}
              {selectedStaffId && (
                <div className="flex flex-col bg-slate-50 p-3 rounded-md border border-slate-300 mt-3">
                  <div className="flex items-center gap-2">
                    <Image
                      src={selectStaff?.imgPath ?? ''}
                      alt={selectStaff?.name ?? ''}
                      className="w-10 h-10 rounded-full"
                      width={40}
                      height={40}
                    />
                    <div className="flex flex-col">
                      <p className="text-slate-500 font-bold text-sm">{selectStaff?.name}</p>
                      <p className="text-slate-500 text-sm">
                        指名料 / ¥{selectStaff?.extraCharge.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : selectedMenuIds.length > 0 ? (
            <div className="flex flex-col bg-red-50 w-fit p-3 rounded-md border border-red-300">
              <p className="text-red-500 text-sm">
                選択したすべてのメニューに対応できるスタッフが見つかりません。メニューの組み合わせを変更してください。
              </p>
            </div>
          ) : null}
          {selectedMenuIds.length > 0 && (
            <div>
              <div className="flex items-center gap-2">
                <p className="text-slate-500 text-lg font-bold">3</p>
                <Label>オプション（複数選択可）</Label>
              </div>
              <div className="mt-2 space-y-2 border p-3 rounded-md">
                {options.map((option) => (
                  <div key={option._id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`option-${option._id}`}
                      checked={selectedOptionIds.includes(option._id)}
                      onCheckedChange={(checked) =>
                        handleOptionToggle(option._id, checked as boolean)
                      }
                    />
                    <div>
                      <label
                        htmlFor={`option-${option._id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {option.name} / {option.timeToMin} 分
                      </label>
                      <p className="text-slate-500 text-xs">
                        {option.salePrice ? (
                          <span className="inline-block -ml-1 text-xs text-slate-500 line-through scale-75">
                            ￥{option.unitPrice}
                          </span>
                        ) : null}
                        <span className="inline-block">
                          ￥{option.unitPrice ?? option.salePrice}
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {errors.optionIds && (
                <p className="text-red-500 text-sm">{errors.optionIds.message}</p>
              )}
            </div>
          )}
          {/* 選択されたオプション表示 */}
          {selectedOptionIds.length > 0 && (
            <div className="bg-slate-50 p-3 rounded-md">
              <Label className="mb-2 block">選択中のオプション</Label>
              <div className="flex flex-wrap gap-2">
                {selectedOptionIds.map((optionId) => {
                  const option = options.find((o) => o._id === optionId);
                  return option ? (
                    <div
                      key={optionId}
                      className="bg-white px-3 py-1 rounded-md flex items-center gap-2 border"
                    >
                      <span className="text-xs">{option.name}</span>
                      <button
                        type="button"
                        onClick={() => handleOptionToggle(optionId, false)}
                        className="text-slate-500 hover:text-slate-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}
          {selectedMenuIds.length > 0 && (
            <div className="flex flex-col gap-2 my-3">
              <div className="flex items-center gap-2">
                <p className="text-slate-500 text-lg font-bold">4</p>
                <Label>予約日</Label>
              </div>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={'outline'}
                    className={cn(
                      'w-[240px] justify-start text-left font-normal',
                      !selectdate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon />
                    {selectdate ? format(selectdate, 'yyyy/MM/dd') : <span>予約日を選択</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    fromDate={new Date()}
                    toDate={toDate}
                    disabled={[
                      ...(salonExceptionSchedules?.map((day) => new Date(day.date)) ?? []),
                      // サロンの営業曜日外を除外
                      (date: Date) => {
                        const dayKey = getDayOfWeek(date);

                        const weekSchedule = salonWeekSchedules?.find(
                          (s) => s.dayOfWeek === dayKey
                        );
                        // 営業スケジュールがあれば isOpen が false の日を無効化。見つからなければ無効化しない。
                        return weekSchedule ? !weekSchedule.isOpen : false;
                      },
                    ]}
                    className="rounded-md"
                    mode="single"
                    locale={ja}
                    selected={selectdate ?? undefined}
                    onSelect={(day) => {
                      setSelectDate(day as Date);
                      setCalendarOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
          {/* 予約可能時間を表示するコンポーネント */}
          {selectdate && selectedStaffId && selectedMenuIds.length > 0 && (
            <div className="mt-4">
              <Label>予約可能時間</Label>
              {availableTimeSlots.length > 0 ? (
                <div className="grid grid-cols-6 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1 mt-2">
                  {availableTimeSlots.map((slot, index) => (
                    <button
                      key={index}
                      type="button"
                      className={`flex items-center justify-center py-2 px-4 text-sm font-medium rounded-md border  ${
                        watch('startTime_unix') === slot.startTime
                          ? 'bg-slate-600 text-white'
                          : 'border-slate-300 '
                      }`}
                      onClick={() => {
                        // 予約開始時間と終了時間を設定
                        setValue('startTime_unix', slot.startTime);
                        setValue('endTime_unix', slot.endTime);
                      }}
                    >
                      <p className="text-xs text-balance">
                        {slot.startTimeFormatted && <span>{slot.startTimeFormatted}</span>}
                        {slot.endTimeFormatted && <span> 〜 {slot.endTimeFormatted}</span>}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-50 p-4 rounded-md mt-2 text-center">
                  <p className="text-slate-500">選択した日時に空き枠がありません</p>
                </div>
              )}
            </div>
          )}{' '}
          <ZodTextField
            ghost
            register={register}
            errors={errors}
            name="startTime_unix"
            type="number"
            label="開始時間 UNIXタイム"
          />
          <ZodTextField
            ghost
            register={register}
            errors={errors}
            name="endTime_unix"
            type="number"
            label="終了時間 UNIXタイム"
          />
          <Textarea {...register('notes')} placeholder="備考" className="resize-none" rows={3} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* 予約詳細カード */}
          {/* メニュー */}
          <div>
            <p className="mb-2 text-xs font-medium text-gray-600">メニュー</p>
            <div className="flex flex-wrap gap-2">
              {selectedMenuIds.length > 0 ? (
                selectedMenuIds.map((menuId) => {
                  const menu = menus.find((m) => m._id === menuId);
                  return (
                    menu && (
                      <Badge key={menuId} variant="outline" className="px-2 py-1 text-xs">
                        {menu.name}
                      </Badge>
                    )
                  );
                })
              ) : (
                <p className="text-slate-500 text-sm">メニューを選択してください</p>
              )}
            </div>
          </div>
          {/* オプション */}
          <div>
            <p className="mb-2 text-xs font-medium text-gray-600">オプション</p>
            <div className="flex flex-wrap gap-2">
              {selectedOptionIds.length > 0 ? (
                selectedOptionIds.map((optionId) => {
                  const option = options.find((o) => o._id === optionId);
                  return (
                    option && (
                      <Badge key={optionId} variant="secondary" className="px-2 py-1 text-xs">
                        {option.name}
                      </Badge>
                    )
                  );
                })
              ) : (
                <p className="text-slate-500 text-sm">オプションは選択されていません</p>
              )}
            </div>
          </div>
          {/* スタッフカード */}
          <div className="flex items-center gap-2">
            <Avatar className="h-16 w-16">
              {selectStaff?.imgPath ? (
                <AvatarImage src={selectStaff.imgPath} alt={selectStaff.name} />
              ) : (
                <AvatarFallback>{selectStaff?.name.slice(0, 1)}</AvatarFallback>
              )}
            </Avatar>
            <div>
              <p className="text-lg font-medium text-gray-800">{selectStaff?.name ?? '—'}</p>
              <p className="text-sm text-gray-500">
                指名料：¥{selectStaff?.extraCharge.toLocaleString() ?? '0'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex justify-end w-full">
          <Button
            className="w-fit mb-8"
            type="submit"
            disabled={isSubmitting || selectedMenuIds.length === 0 || !selectedStaffId}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                予約中...
              </span>
            ) : (
              '予約を作成'
            )}
          </Button>
        </div>
      </form>
      <div className="sticky bottom-2 left-0 right-0 justify-between items-center gap-4 p-4 mt-2 bg-slate-50 rounded-md border">
        <div className="relative flex justify-between items-center gap-4 pt-3">
          {selectdate ? (
            <p className="absolute -top-2 left-0 text-sm text-slate-500">
              <span className="text-slate-500 text-xs font-bold tracking-wide">
                {format(selectdate, 'yyyy年MM月dd日')}
              </span>
              <span className="text-slate-500 text-sm font-bold tracking-wide ml-4">
                <span className="text-slate-500 text-xs font-normal">施術時刻 </span>
                {watch('startTime_unix') && watch('endTime_unix') ? (
                  <>
                    {formatJpTime(watch('startTime_unix')!)}
                    {' ~ '}
                    {formatJpTime(watch('endTime_unix')!)}
                  </>
                ) : null}
              </span>
            </p>
          ) : null}

          <div>
            <Label>合計金額</Label>
            <p className="text-lg font-bold">¥{totalPriceCalculated.toLocaleString()}</p>
          </div>
          <div>
            <Label>所要時間</Label>
            <p className="text-lg font-bold">{totalTimeMinutes} 分</p>
          </div>
        </div>
      </div>
    </div>
  );
}
