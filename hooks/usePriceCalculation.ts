'use client';

import { useMemo } from 'react';
import type { ReservationMenu, ReservationOption, Gender, ImageType } from '@/convex/types';
import type { Doc, Id } from '@/convex/_generated/dataModel';


export type AvailableStaff = {
  _id: Id<'staff'>
  name: string
  age: number | undefined
  instagram_link: string | undefined
  gender: Gender | undefined
  description: string | undefined
  images: ImageType[] | undefined
  is_active: boolean
  _creationTime: number
  featured_hair_images: ImageType[] | undefined
  extra_charge: number | undefined
  priority: number | undefined
  week_schedules:
    | {
        _id: Id<'staff_week_schedule'>
        _creationTime: number
        is_archive?: boolean | undefined
        updated_at?: number | undefined
        is_open: boolean
      }[]
    | undefined
}

interface UsePriceCalculationProps {
  selectedMenus: ReservationMenu[];
  selectedOptions: ReservationOption[];
  menus?: Doc<'menu'>[];
  options?: Doc<'option'>[];
  selectedStaffId?: string | null;
  availableStaff?: AvailableStaff[];
}


export function usePriceCalculation({
  selectedMenus,
  selectedOptions,
  menus,
  options,
  selectedStaffId,
  availableStaff = []
}: UsePriceCalculationProps) {
  // メニューの合計時間計算
  const totalTimeMinutes = useMemo(() => {
    const menuTime = selectedMenus.reduce((sum, item) => {
      const menu = menus?.find((m) => m._id === item.id);
      return sum + (menu?.duration_min ?? 0);
    }, 0);

    const optionTime = selectedOptions.reduce((sum, item) => {
      const option = options?.find((o) => o._id === item.id);
      return sum + (option?.duration_min ?? 0) * item.quantity;
    }, 0);

    return menuTime + optionTime;
  }, [selectedMenus, selectedOptions, menus, options]);

  // メニューの合計金額計算
  const menuTotalPrice = useMemo(() => {
    return selectedMenus.reduce((sum, item) => {
      const menu = menus?.find((m) => m._id === item.id);
      if (!menu) return sum;
      const price = menu.sale_price && menu.sale_price > 0 ? menu.sale_price : (menu.unit_price ?? 0);
      return sum + price;
    }, 0);
  }, [selectedMenus, menus]);

  // オプションの合計金額計算
  const optionTotalPrice = useMemo(() => {
    return selectedOptions.reduce((sum, item) => {
      const option = options?.find((o) => o._id === item.id);
      if (!option) return sum;
      const price = option.sale_price && option.sale_price > 0 ? option.sale_price : (option.unit_price ?? 0);
      return sum + price * item.quantity;
    }, 0);
  }, [selectedOptions, options]);

  // スタッフ指名料計算
  const extraChargePrice = useMemo(() => {
    if (!selectedStaffId) return 0;
    const staff = availableStaff.find((s) => s._id === selectedStaffId);
    return staff?.extra_charge ?? 0;
  }, [selectedStaffId, availableStaff]);

  // 総合計金額計算
  const totalPrice = useMemo(() => {
    return menuTotalPrice + optionTotalPrice + extraChargePrice;
  }, [menuTotalPrice, optionTotalPrice, extraChargePrice]);

  return {
    totalTimeMinutes,
    menuTotalPrice,
    optionTotalPrice,
    extraChargePrice,
    totalPrice,
  };
}