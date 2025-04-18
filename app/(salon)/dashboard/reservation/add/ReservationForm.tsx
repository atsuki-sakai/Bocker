'use client';

import { z } from 'zod';
import { ja } from 'date-fns/locale';

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

import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useZodForm } from '@/hooks/useZodForm';
import { useSalon } from '@/hooks/useSalon';
import { ZodTextField } from '@/components/common';
import { Loading } from '@/components/common';
import { Button } from '@/components/ui/button';

import {
  RESERVATION_STATUS_VALUES,
  PAYMENT_METHOD_VALUES,
} from '@/services/convex/shared/types/common';
const schemaReservation = z.object({
  customerId: z.string().optional(), // 顧客ID
  staffId: z.string().optional(), // スタッフID
  menuId: z.string().optional(), // メニューID
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

import { usePaginatedQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fetchQuery } from 'convex/nextjs';
import { useState } from 'react';
import { Id } from '@/convex/_generated/dataModel';
import { Textarea } from '@/components/ui/textarea';
import { Gender } from '@/services/convex/shared/types/common';
type AvailableStaff = {
  _id: Id<'staff'>;
  name: string;
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

  const [selectedMenuId, setSelectedMenuId] = useState<Id<'menu'> | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<Id<'staff'> | null>(null);
  const [selectdate, setSelectDate] = useState<Date | null>(null);
  const [availableStaff, setAvailableStaff] = useState<AvailableStaff[]>([]);
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

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useZodForm(schemaReservation);

  useEffect(() => {
    if (!salonId) return;
    reset({
      customerId: 'customer_id', // 顧客ID
      staffId: '', // スタッフID
      menuId: '', // メニューID
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
      paymentMethod: undefined, // 支払い方法
    });
  }, [salonId, reset]);

  useEffect(() => {
    if (!selectedMenuId || !salonId) return;
    const getAvailableStaff = async () => {
      const getAvailableStaffs = await fetchQuery(api.staff.core.query.findAvailableStaffByMenu, {
        salonId: salonId,
        menuId: selectedMenuId,
      });
      setAvailableStaff(getAvailableStaffs as AvailableStaff[]);
      setValue('staffId', getAvailableStaffs[0]._id);
    };
    getAvailableStaff();
  }, [selectedMenuId, salonId, setAvailableStaff, setValue]);

  const onSubmit = (data: z.infer<typeof schemaReservation>) => {
    console.log(data, errors);
    console.log('onSubmit');
  };

  if (!salon || !salonId) return <Loading />;

  console.log('selectedMenuId: ', selectedMenuId);
  console.log('watch menuId: ', watch('menuId'));
  console.log('availableStaff: ', availableStaff);

  console.log('selectedStaffId: ', selectedStaffId);
  console.log('watch staffId: ', watch('staffId'));

  console.log('selectdate: ', new Date(selectdate as Date).toLocaleDateString());
  return (
    <div className="container mx-auto">
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
            <Label>予約するメニュー</Label>
            <Select
              value={selectedMenuId ?? watch('menuId')}
              onValueChange={(value: string | undefined) => {
                setSelectedMenuId(value as Id<'menu'>);
                setValue('menuId', value as Id<'menu'>);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="メニューを選択" />
              </SelectTrigger>
              <SelectContent>
                {menus.map((menu) => (
                  <SelectItem key={menu._id} value={menu._id}>
                    {menu.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.menuId && <p className="text-red-500 text-sm">{errors.menuId.message}</p>}
          </div>
          {selectedMenuId && availableStaff.length > 0 && (
            <div>
              <Label>施術するスタッフ</Label>
              <Select
                value={watch('staffId') ?? ''}
                onValueChange={(value: string) => {
                  console.log('スタッフ選択:', value); // デバッグ用
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
            </div>
          )}

          <div>
            <Label>オプション</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="オプションを選択" />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option._id} value={option._id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.optionIds && <p className="text-red-500 text-sm">{errors.optionIds.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label>予約日</Label>
            <Popover>
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
                  className="rounded-md"
                  mode="single"
                  locale={ja}
                  selected={selectdate ?? undefined}
                  onSelect={(day) => setSelectDate(day as Date)}
                />
              </PopoverContent>
            </Popover>
          </div>

          <ZodTextField
            register={register}
            errors={errors}
            name="startTime_unix"
            type="number"
            label="開始時間 UNIXタイム"
          />
          <ZodTextField
            register={register}
            errors={errors}
            name="endTime_unix"
            type="number"
            label="終了時間 UNIXタイム"
          />

          <ZodTextField register={register} errors={errors} name="couponId" label="クーポンID" />

          <Textarea {...register('notes')} placeholder="備考" className="resize-none" rows={3} />
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              予約中...
            </span>
          ) : (
            '予約を作成'
          )}
        </Button>
      </form>
    </div>
  );
}
