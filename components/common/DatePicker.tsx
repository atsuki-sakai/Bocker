'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import type { Locale } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTranslations, useLocale } from 'next-intl';
import { getDateFnsLocale, type SupportedLocale } from '@/lib/dateLocale';

interface DatePickerProps {
  /**
   * 選択された日付
   */
  value?: Date;
  
  /**
   * 日付変更時のコールバック
   */
  onChange?: (date: Date | undefined) => void;
  
  /**
   * プレースホルダーテキスト
   */
  placeholder?: string;
  
  /**
   * 無効化フラグ
   */
  disabled?: boolean;
  
  /**
   * 最小選択可能日付
   */
  fromDate?: Date;
  
  /**
   * 最大選択可能日付
   */
  toDate?: Date;
  
  /**
   * 追加のクラス名
   */
  className?: string;
  
  /**
   * エラー状態
   */
  error?: boolean;
}

/**
 * ローカライズ対応の日付選択コンポーネント
 * Next.jsのi18n設定と連動してdate-fnsロケールを使用
 */
export function DatePicker({
  value,
  onChange,
  placeholder,
  disabled = false,
  fromDate,
  toDate,
  className,
  error = false,
}: DatePickerProps) {
  const currentLocale = useLocale() as SupportedLocale;
  const t = useTranslations('common.datePicker');
  const [dateFnsLocale, setDateFnsLocale] = useState<Locale | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // 現在のロケールに基づいてdate-fnsロケールを動的に読み込み
  useEffect(() => {
    const loadLocale = async () => {
      const locale = await getDateFnsLocale(currentLocale);
      setDateFnsLocale(locale);
    };
    loadLocale();
  }, [currentLocale]);

  const handleDateSelect = (date: Date | undefined) => {
    onChange?.(date);
    setIsOpen(false);
  };

  // ロケールが読み込まれていない場合は標準のinput type="date"にフォールバック
  if (!dateFnsLocale) {
    return (
      <input
        type="date"
        value={value ? format(value, 'yyyy-MM-dd') : ''}
        onChange={(e) => onChange?.(e.target.value ? new Date(e.target.value) : undefined)}
        disabled={disabled}
        className={cn(
          "flex h-9 w-full rounded-md bg-input border px-3 py-1 text-base shadow-sm transition-colors",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm hover:border-ring",
          error && "border-destructive",
          className
        )}
      />
    );
  }

  // ロケールに応じた表示フォーマット
  const displayFormat = currentLocale === 'ja' ? 'yyyy年MM月dd日' : 'PPP';

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal h-9 bg-input",
            !value && "text-muted-foreground",
            error && "border-destructive",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? (
            format(value, displayFormat, { locale: dateFnsLocale })
          ) : (
            <span>{placeholder || t('selectDate')}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleDateSelect}
          disabled={disabled}
          fromDate={fromDate}
          toDate={toDate}
          locale={dateFnsLocale}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}