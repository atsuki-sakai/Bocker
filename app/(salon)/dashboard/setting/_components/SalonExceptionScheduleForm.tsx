'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useSalon } from '@/hooks/useSalon';
import { Button } from '@/components/ui/button';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Loading } from '@/components/common';
import { format, startOfToday } from 'date-fns';
import { ja } from 'date-fns/locale';
import { CalendarX2, Save, Info, CheckCircle, Calendar } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { handleErrorToMsg } from '@/lib/error';

// カスタムカレンダーコンポーネントをインポート
import CalendarMultiSelect from '@/components/common/CalendarMultiSelect';

// アニメーション用のバリアント定義
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.1,
      staggerChildren: 0.07,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
};

// 日付をフォーマットするユーティリティ関数
const formatDate = (date: Date): string => {
  return format(date, 'yyyy年M月d日(E)', { locale: ja });
};

export default function SalonExceptionScheduleForm() {
  const { salonId } = useSalon();
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  // 変更検知用の初期日付配列とダーティフラグ
  const [initialDates, setInitialDates] = useState<string[] | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // 初期データロード完了フラグ
  const initialDataLoaded = useRef<boolean>(false);

  // 今日の日付を取得（時刻は00:00:00に設定）- メモ化
  const today = useMemo(() => startOfToday(), []);

  // 既存の休業日を取得
  const exceptionSchedules = useQuery(
    api.schedule.salon_exception.query.getByScheduleList,
    salonId ? { salonId } : 'skip'
  );

  // データロード中かどうか
  const isLoading = exceptionSchedules === undefined;

  // 休業日を登録するミューテーション
  const addExceptionSchedule = useMutation(api.schedule.salon_exception.mutation.create);
  // 休業日を削除するミューテーション
  const killExceptionSchedule = useMutation(api.schedule.salon_exception.mutation.kill);

  // 初期表示時のみ既存の休業日をカレンダーに設定（今日以降の日付のみ）
  useEffect(() => {
    // 初期データロード済み、または保存中は処理しない
    if (initialDataLoaded.current || isSaving) {
      return;
    }

    // データがロードされたら初期化処理
    if (exceptionSchedules !== undefined) {
      if (exceptionSchedules && exceptionSchedules.length > 0) {
        // 文字列の日付をDateオブジェクトに変換し、今日以降の日付のみを選択
        const dates = exceptionSchedules
          .map((schedule: Doc<'salon_schedule_exception'>) => new Date(schedule.date))
          .filter((date: Date) => date >= today); // 今日以降の日付のみ
        setSelectedDates(dates);
      } else {
        // 休業日が0件の場合は空配列をセット
        setSelectedDates([]);
      }

      // 初期日付リストを文字列化してソートして保存
      const formatted = (exceptionSchedules || [])
        .map((s) => format(new Date(s.date), 'yyyy-MM-dd'))
        .filter((d) => d >= format(today, 'yyyy-MM-dd'))
        .sort();
      setInitialDates(formatted);

      // 初期データロード完了をマーク
      initialDataLoaded.current = true;
    }
  }, [exceptionSchedules, today, isSaving]);

  // 選択日付の変更検知
  useEffect(() => {
    if (initialDates) {
      const current = selectedDates.map((date) => format(date, 'yyyy-MM-dd')).sort();
      setIsDirty(JSON.stringify(initialDates) !== JSON.stringify(current));
    }
  }, [selectedDates, initialDates]);

  // 日付選択時の処理 - コールバック関数化
  const handleDatesChange = useCallback((dates: Date[]) => {
    setSelectedDates(dates);
  }, []);

  // 選択された日付を保存
  const handleSave = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (!salonId) return;

      // 非同期処理を内部で実行
      const saveData = async () => {
        try {
          setIsSaving(true);

          // 登録済みの日付を特定（IDと日付の対応を取得）
          const existingDates: Map<string, Id<'salon_schedule_exception'>> = exceptionSchedules
            ? new Map(exceptionSchedules.map((s) => [s.date, s._id]))
            : new Map();

          // 選択されている日付の書式を統一
          const selectedFormattedDates = selectedDates.map((date) => format(date, 'yyyy-MM-dd'));

          // 新規追加する日付を収集
          const datesToAdd: Array<{
            salonId: typeof salonId;
            type: 'holiday';
            date: string;
          }> = [];
          for (const date of selectedDates) {
            const formattedDate = format(date, 'yyyy-MM-dd');
            if (!existingDates.has(formattedDate)) {
              datesToAdd.push({
                salonId,
                type: 'holiday' as const,
                date: formattedDate,
              });
            }
          }

          // 削除する日付を収集
          const idsToDelete: Id<'salon_schedule_exception'>[] = [];
          if (exceptionSchedules) {
            for (const schedule of exceptionSchedules) {
              const scheduleDate = new Date(schedule.date);
              if (scheduleDate >= today && !selectedFormattedDates.includes(schedule.date)) {
                idsToDelete.push(schedule._id);
              }
            }
          }

          // 追加処理を並列実行
          if (datesToAdd.length > 0) {
            await Promise.all(datesToAdd.map((data) => addExceptionSchedule(data)));
          }

          // 削除処理を並列実行
          if (idsToDelete.length > 0) {
            await Promise.all(
              idsToDelete.map((id) =>
                killExceptionSchedule({
                  salonScheduleExceptionId: id as Id<'salon_schedule_exception'>,
                })
              )
            );
          }

          // 成功通知
          toast.success('休業日を保存しました', {
            description: `${datesToAdd.length}日追加・${idsToDelete.length}日削除しました`,
            duration: 3000,
          });

          // 成功メッセージを表示し、3秒後に非表示にする
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 3000);
        } catch (error: unknown) {
          console.error('休業日の保存に失敗しました', error);
          toast.error(handleErrorToMsg(error));
        } finally {
          setIsSaving(false);
        }
      };

      // 非同期処理を実行
      saveData();
    },
    [salonId, selectedDates, exceptionSchedules, today, addExceptionSchedule, killExceptionSchedule]
  );

  // ローディング中の表示
  if (!salonId) {
    return (
      <div className="flex flex-col items-center justify-center p-4 sm:p-8 h-48 sm:h-64">
        <Loading />
      </div>
    );
  }

  return (
    <motion.div
      className="w-full px-2 sm:px-4 md:px-0"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <Card className="shadow-xl border-0 overflow-hidden bg-white dark:bg-slate-800 w-full">
        <CardHeader className="bg-indigo-50 border-b pb-4 sm:pb-6 px-4 sm:px-6">
          <motion.div className="flex items-center gap-2" variants={itemVariants}>
            <CalendarX2 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
            <CardTitle className="text-lg sm:text-xl">休業日設定</CardTitle>
          </motion.div>
          <motion.div variants={itemVariants}>
            <CardDescription className="text-xs sm:text-sm mt-1">
              カレンダーから予約を受け付けない日を選択してください。選択された日は休業日として設定されます。
            </CardDescription>
          </motion.div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* インフォメーションアラート */}
          <motion.div variants={itemVariants}>
            <Alert className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 sm:p-4">
              <Info className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <AlertDescription className="text-blue-700 dark:text-blue-300 text-xs sm:text-sm ml-2">
                <span className="font-medium block mb-1">休業日の設定について</span>
                休業日に設定した日は、カレンダーに表示されず予約を受け付けなくなります。
                定休日とは別に、臨時休業やイベント日、長期休暇などを設定できます。 今日(
                {formatDate(today)})以降の日付が選択可能です。
              </AlertDescription>
            </Alert>
          </motion.div>
          {/* カレンダーとリスト表示のグリッドレイアウト */}
          <motion.div className="w-full" variants={itemVariants}>
            <div className="bg-white dark:bg-slate-800 rounded-lg border shadow-sm p-3 sm:p-4">
              <h3 className="text-sm sm:text-base font-semibold flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4 text-slate-800 dark:text-slate-200">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-600 dark:text-rose-400" />
                休業日を選択
              </h3>

              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-64 sm:h-72 w-full bg-slate-200 dark:bg-slate-700" />
                </div>
              ) : (
                <div className="max-w-full overflow-x-auto">
                  <CalendarMultiSelect
                    selectedDates={selectedDates}
                    onDatesChangeAction={handleDatesChange}
                    fromDate={today} // 今日以降の日付のみ選択可能に
                  />
                </div>
              )}
            </div>
          </motion.div>
        </CardContent>

        <CardFooter className="bg-gray-50 dark:bg-slate-900/50 border-t p-3 sm:p-4 flex justify-between items-center flex-wrap gap-2">
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            <AnimatePresence>
              {showSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="flex items-center text-green-600 dark:text-green-400"
                >
                  <CheckCircle className="mr-1 sm:mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  保存しました
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            variants={itemVariants}
          >
            <Button
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              className="shadow-md text-xs sm:text-sm"
              size="default"
              // モバイル向けにサイズを調整
              style={{
                minWidth: 'max-content',
                padding: window.innerWidth < 640 ? '0.5rem 0.75rem' : undefined,
              }}
            >
              {isSaving ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="mr-1.5"
                  >
                    <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" viewBox="0 0 24 24">
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
                  <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />
                  休業日を保存
                </>
              )}
            </Button>
          </motion.div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}