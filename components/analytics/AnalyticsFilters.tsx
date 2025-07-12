"use client";

import React, { useState, useCallback } from 'react';
import { CalendarIcon, Filter, X } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { ja } from 'date-fns/locale';
import { DateRange as DayPickerDateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

import { FilterOptions, SelectOption } from '@/services/supabase/repositories/analytics/types';

interface AnalyticsFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  staffOptions?: SelectOption[];
  menuOptions?: SelectOption[];
  loading?: boolean;
  className?: string;
  showStaffFilter?: boolean;
  showMenuFilter?: boolean;
  showPresetRanges?: boolean;
}

/**
 * プリセット日付範囲
 */
const PRESET_RANGES = [
  {
    label: '今日',
    getValue: () => ({ from: new Date(), to: new Date() })
  },
  {
    label: '昨日',
    getValue: () => {
      const yesterday = subDays(new Date(), 1);
      return { from: yesterday, to: yesterday };
    }
  },
  {
    label: '過去7日間',
    getValue: () => ({ from: subDays(new Date(), 6), to: new Date() })
  },
  {
    label: '過去30日間',
    getValue: () => ({ from: subDays(new Date(), 29), to: new Date() })
  },
  {
    label: '今月',
    getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })
  },
  {
    label: '先月',
    getValue: () => {
      const lastMonth = subDays(startOfMonth(new Date()), 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    }
  },
  {
    label: '今年',
    getValue: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) })
  }
];

/**
 * 分析フィルターコンポーネント
 * 日付範囲、スタッフ、メニューの選択機能を提供
 */
export function AnalyticsFilters({
  filters,
  onFiltersChange,
  staffOptions = [],
  menuOptions = [],
  loading = false,
  className = "",
  showStaffFilter = true,
  showMenuFilter = true,
  showPresetRanges = true
}: AnalyticsFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  /**
   * 日付範囲を更新
   */
  const handleDateRangeChange = useCallback((dateRange: DayPickerDateRange | undefined) => {
    if (dateRange?.from && dateRange?.to) {
      onFiltersChange({
        ...filters,
        dateRange: {
          from: dateRange.from,
          to: dateRange.to
        }
      });
    }
  }, [filters, onFiltersChange]);

  /**
   * プリセット範囲を選択
   */
  const handlePresetRangeSelect = useCallback((preset: typeof PRESET_RANGES[0]) => {
    const range = preset.getValue();
    handleDateRangeChange(range);
  }, [handleDateRangeChange]);

  /**
   * スタッフ選択を更新
   */
  const handleStaffChange = useCallback((staffIds: string[]) => {
    onFiltersChange({
      ...filters,
      staffIds
    });
  }, [filters, onFiltersChange]);

  /**
   * メニュー選択を更新
   */
  const handleMenuChange = useCallback((menuIds: string[]) => {
    onFiltersChange({
      ...filters,
      menuIds
    });
  }, [filters, onFiltersChange]);

  /**
   * スタッフフィルタを追加
   */
  const addStaffFilter = useCallback((staffId: string) => {
    const currentStaffIds = filters.staffIds || [];
    if (!currentStaffIds.includes(staffId)) {
      handleStaffChange([...currentStaffIds, staffId]);
    }
  }, [filters.staffIds, handleStaffChange]);

  /**
   * スタッフフィルタを削除
   */
  const removeStaffFilter = useCallback((staffId: string) => {
    const currentStaffIds = filters.staffIds || [];
    handleStaffChange(currentStaffIds.filter(id => id !== staffId));
  }, [filters.staffIds, handleStaffChange]);

  /**
   * メニューフィルタを追加
   */
  const addMenuFilter = useCallback((menuId: string) => {
    const currentMenuIds = filters.menuIds || [];
    if (!currentMenuIds.includes(menuId)) {
      handleMenuChange([...currentMenuIds, menuId]);
    }
  }, [filters.menuIds, handleMenuChange]);

  /**
   * メニューフィルタを削除
   */
  const removeMenuFilter = useCallback((menuId: string) => {
    const currentMenuIds = filters.menuIds || [];
    handleMenuChange(currentMenuIds.filter(id => id !== menuId));
  }, [filters.menuIds, handleMenuChange]);

  /**
   * 全フィルタをクリア
   */
  const clearAllFilters = useCallback(() => {
    onFiltersChange({
      ...filters,
      staffIds: [],
      menuIds: []
    });
  }, [filters, onFiltersChange]);

  /**
   * アクティブフィルタ数を計算
   */
  const activeFilterCount = (filters.staffIds?.length || 0) + (filters.menuIds?.length || 0);

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            フィルター
          </CardTitle>
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount}件選択中
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                disabled={loading}
                className="text-xs"
              >
                クリア
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 日付範囲選択 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">期間</label>
          <div className="flex flex-col gap-2">
            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal w-full",
                    !filters.dateRange && "text-muted-foreground"
                  )}
                  disabled={loading}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange?.from ? (
                    filters.dateRange.to ? (
                      <>
                        {format(filters.dateRange.from, "M月d日", { locale: ja })} -{" "}
                        {format(filters.dateRange.to, "M月d日", { locale: ja })}
                      </>
                    ) : (
                      format(filters.dateRange.from, "M月d日", { locale: ja })
                    )
                  ) : (
                    "期間を選択"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="flex">
                  {/* プリセット範囲 */}
                  {showPresetRanges && (
                    <div className="border-r p-3 space-y-1">
                      <div className="text-sm font-medium mb-2">プリセット</div>
                      {PRESET_RANGES.map((preset) => (
                        <Button
                          key={preset.label}
                          variant="ghost"
                          size="sm"
                          className="justify-start w-full text-sm h-8"
                          onClick={() => {
                            handlePresetRangeSelect(preset);
                            setIsOpen(false);
                          }}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                  )}
                  
                  {/* カレンダー */}
                  <div className="p-3">
                    <Calendar
                      mode="range"
                      defaultMonth={filters.dateRange?.from}
                      selected={filters.dateRange}
                      onSelect={handleDateRangeChange}
                      numberOfMonths={2}
                      locale={ja}
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            
            {/* 選択した期間の表示 */}
            {filters.dateRange?.from && filters.dateRange?.to && (
              <div className="text-xs text-muted-foreground">
                {Math.ceil((filters.dateRange.to.getTime() - filters.dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1}日間
              </div>
            )}
          </div>
        </div>

        {(showStaffFilter || showMenuFilter) && <Separator />}

        {/* スタッフフィルター */}
        {showStaffFilter && staffOptions.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">スタッフ</label>
            <Select onValueChange={addStaffFilter} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="スタッフを選択" />
              </SelectTrigger>
              <SelectContent>
                {staffOptions
                  .filter(option => !filters.staffIds?.includes(option.value))
                  .map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            
            {/* 選択されたスタッフ */}
            {filters.staffIds && filters.staffIds.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {filters.staffIds.map((staffId) => {
                  const staff = staffOptions.find(option => option.value === staffId);
                  return (
                    <Badge key={staffId} variant="secondary" className="text-xs">
                      {staff?.label || staffId}
                      <button
                        className="ml-1 hover:bg-muted-foreground/20 rounded-full"
                        onClick={() => removeStaffFilter(staffId)}
                        disabled={loading}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* メニューフィルター */}
        {showMenuFilter && menuOptions.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">メニュー</label>
            <Select onValueChange={addMenuFilter} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="メニューを選択" />
              </SelectTrigger>
              <SelectContent>
                {menuOptions
                  .filter(option => !filters.menuIds?.includes(option.value))
                  .map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            
            {/* 選択されたメニュー */}
            {filters.menuIds && filters.menuIds.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {filters.menuIds.map((menuId) => {
                  const menu = menuOptions.find(option => option.value === menuId);
                  return (
                    <Badge key={menuId} variant="secondary" className="text-xs">
                      {menu?.label || menuId}
                      <button
                        className="ml-1 hover:bg-muted-foreground/20 rounded-full"
                        onClick={() => removeMenuFilter(menuId)}
                        disabled={loading}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AnalyticsFilters;