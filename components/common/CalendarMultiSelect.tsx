'use client';

import React, { useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { AnimatePresence, motion } from 'framer-motion';
import { format, isSameDay, isToday } from 'date-fns';
import { ja } from 'date-fns/locale';
import { CalendarIcon, X, CalendarCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * 複数日選択用カレンダーコンポーネントのProps定義
 */
interface CalendarMultiSelectProps {
  /**
   * 親コンポーネントで管理する選択中の日付配列
   */
  selectedDates: Date[];

  /**
   * 日付選択/解除時に呼ばれるコールバック
   * 新しい日付配列を親コンポーネントに渡す
   */
  onDatesChangeAction: (dates: Date[]) => void;

  /**
   * カレンダーの最小選択可能日付
   * 指定した日付より前は選択できなくなります
   */
  fromDate?: Date;
  disabled?: boolean;
}

// アニメーション用のバリアント定義
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
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: {
      duration: 0.2,
    },
  },
};

const emptyStateVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.2,
      duration: 0.3,
    },
  },
};

/**
 * 複数日選択用のCalendarコンポーネント
 * パフォーマンス最適化のためメモ化
 */
function CalendarMultiSelect({
  selectedDates,
  onDatesChangeAction,
  fromDate,
  disabled,
}: CalendarMultiSelectProps) {
  // 日付選択ハンドラ
  const handleDatesSelect = (dates: Date[] | undefined) => {
    onDatesChangeAction(dates || []);
  };

  // 個別の日付削除ハンドラ
  const removeDate = (date: Date) => {
    const newDates = selectedDates.filter((d) => !isSameDay(d, date));
    onDatesChangeAction(newDates);
  };

  // 全ての日付削除ハンドラ
  const clearAllDates = () => {
    onDatesChangeAction([]);
  };

  // 選択された日付があるかどうか
  const hasSelectedDates = selectedDates.length > 0;

  // 日付の昇順ソート (useMemoでパフォーマンス最適化)
  const sortedDates = useMemo(() => {
    return [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
  }, [selectedDates]);

  // 月ごとにグループ化した選択日付 (useMemoでパフォーマンス最適化)
  const groupedByMonth = useMemo(() => {
    const groups: Record<string, Date[]> = {};

    for (const date of sortedDates) {
      const monthKey = format(date, 'yyyy年MM月', { locale: ja });
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(date);
    }

    return Object.entries(groups);
  }, [sortedDates]);

  return (
    <div className="flex flex-col sm:flex-row gap-5">
      {/* カレンダーコンポーネント */}
      <div className="bg-background rounded-lg p-1 border border-border">
        {/* Shadcn標準のカレンダーコンポーネントを使用 - カスタムDayコンポーネントは不要 */}
        <Calendar
          disabled={disabled}
          mode="multiple"
          selected={selectedDates}
          onSelect={handleDatesSelect}
          fromDate={fromDate}
          locale={ja}
          className="rounded-md"
        />
      </div>

      {/* 選択された日付一覧 */}
      <div className="border rounded-md p-4 w-full bg-background border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-xs sm:text-sm text-primary flex items-center gap-2">
            <Badge className="ml-1 text-nowrap bg-muted text-muted-foreground border-muted">
              {selectedDates.length}件
            </Badge>{' '}
            選択済みの日
          </h3>

          {hasSelectedDates && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:bg-destructive hover:text-white"
                    onClick={clearAllDates}
                  >
                    全て削除
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>選択した全ての日付を削除します</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <ScrollArea className="h-60 pr-4">
          {hasSelectedDates ? (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              {/* 月ごとのグループ表示 */}
              {groupedByMonth.map(([month, dates]) => (
                <div key={month} className="space-y-2">
                  <h4 className="text-xs font-medium text-primary border-b border-border pb-1 mb-2">
                    {month}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <AnimatePresence>
                      {dates.map((date) => (
                        <motion.div
                          key={date.toISOString()}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          layout
                          className="group"
                        >
                          <Badge
                            variant="secondary"
                            className={`
                              px-3 py-1.5 transition-all flex items-center border
                              ${
                                isToday(date)
                                  ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700/70'
                                  : 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-800/70'
                              }
                              group-hover:shadow-sm
                            `}
                          >
                            <CalendarIcon
                              className={`
                              h-3 w-3 mr-2
                              ${isToday(date) ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-500 dark:text-indigo-400'}
                            `}
                            />
                            <span
                              className={`
                              ${isToday(date) ? 'text-amber-800 dark:text-amber-300' : 'text-gray-700 dark:text-gray-300'}
                            `}
                            >
                              {format(date, 'yyyy年MM月dd日(EEE)', {
                                locale: ja,
                              })}
                              {isToday(date) && (
                                <span className="ml-1 text-[10px] bg-amber-200 dark:bg-amber-700 px-1 py-0.5 rounded text-amber-800 dark:text-amber-200">
                                  今日
                                </span>
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeDate(date)}
                              className="ml-2 text-gray-400 hover:text-rose-500 dark:hover:text-rose-400 w-5 h-5 flex items-center justify-center rounded-full transition-colors hover:bg-rose-50 dark:hover:bg-rose-900/30"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              variants={emptyStateVariants}
              initial="hidden"
              animate="visible"
              className="flex flex-col items-center justify-center h-full py-8 text-center text-muted-foreground"
            >
              <CalendarCheck className="w-12 h-12 mb-3 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">まだ休業日が選択されていません</p>
              <p className="text-xs max-w-xs">
                左側のカレンダーから休業日として設定したい日付を選択してください
              </p>
            </motion.div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}

// パフォーマンス最適化のためメモ化しエクスポート
export default React.memo(CalendarMultiSelect);
