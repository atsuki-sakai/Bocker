'use client';

import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { ChevronLeft, ChevronRight, Ellipsis } from 'lucide-react';
import { DashboardSection } from '@/components/common';
import { useSalon } from '@/hooks/useSalon';
import { useStablePaginatedQuery } from '@/hooks/useStablePaginatedQuery';
import { api } from '@/convex/_generated/api';
import { useRef, useState, useEffect, useMemo } from 'react';
import {
  startOfWeek as startOfWeekFns,
  endOfWeek as endOfWeekFns,
  format,
  isSameDay,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { Id, Doc } from '@/convex/_generated/dataModel';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePaginatedQuery } from 'convex/react';

export default function TimelinePage() {
  const { salonId } = useSalon();

  const container = useRef<HTMLDivElement | null>(null);
  const containerNav = useRef<HTMLDivElement | null>(null);
  const containerOffset = useRef<HTMLDivElement | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<Id<'staff'> | null>(null);

  // 現在の日付と選択された日付を管理
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // スマートフォン表示用の選択日
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // ビューモード（週表示または日表示）
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');

  // 日本の週の始まりは月曜日なので、optionsで指定
  const startOfWeek = startOfWeekFns(currentDate, { weekStartsOn: 1 });
  const endOfWeek = endOfWeekFns(currentDate, { weekStartsOn: 1 });

  const [currentReservations, setCurrentReservations] = useState<Doc<'reservation'>[]>([]);

  const { results: reservations } = useStablePaginatedQuery(
    api.reservation.query.findBySalonIdAndStaffId,
    salonId && selectedStaffId
      ? {
          salonId,
          staffId: selectedStaffId,
        }
      : 'skip',
    {
      initialNumItems: 10,
    }
  );

  const staffs = usePaginatedQuery(
    api.staff.core.query.getStaffListBySalonId,
    salonId
      ? {
          salonId,
        }
      : 'skip',
    {
      initialNumItems: 50,
    }
  );

  // 曜日の配列（日本語）
  const weekDays: string[] = ['月', '火', '水', '木', '金', '土', '日'];
  const weekDaysFull: string[] = [
    '月曜日',
    '火曜日',
    '水曜日',
    '木曜日',
    '金曜日',
    '土曜日',
    '日曜日',
  ];

  // 現在の週の日付を計算
  const getDaysOfWeek = (): Date[] => {
    const days: Date[] = [];
    const day = new Date(startOfWeek);

    for (let i = 0; i < 7; i++) {
      days.push(new Date(day));
      day.setDate(day.getDate() + 1);
    }

    return days;
  };

  const daysOfWeek = useMemo(() => getDaysOfWeek(), [startOfWeek]);

  // 画面サイズの変更を監視
  useEffect(() => {
    const checkScreenSize = (): void => {
      // モバイルの場合、デフォルトで日表示に
      if (window.innerWidth < 768) {
        setViewMode('day');
      } else {
        setViewMode('week');
      }
    };

    // 初期チェック
    checkScreenSize();

    // リサイズイベントのリスナー
    window.addEventListener('resize', checkScreenSize);

    // クリーンアップ
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  // 日付変更時に選択日も更新
  useEffect(() => {
    setSelectedDate(daysOfWeek[0]);
  }, [daysOfWeek]);

  // 予約データの更新
  useEffect(() => {
    if (reservations) {
      setCurrentReservations(reservations);
    }
  }, [reservations]);

  const renderReservations = () => {
    if (!currentReservations) return null;

    return currentReservations.map((reservation) => {
      // Adjust for JST offset (UTC+9)
      const startTime = new Date(reservation.startTime_unix! * 1000 - 9 * 60 * 60 * 1000);
      const endTime = new Date(reservation.endTime_unix! * 1000 - 9 * 60 * 60 * 1000);

      // 週表示の場合は週内の予約を全て表示
      // 日表示の場合は選択された日付の予約のみを表示
      if (viewMode === 'week') {
        if (startTime < startOfWeek || startTime > endOfWeek) return null;
      } else {
        // 選択された日付と同じ日付かどうかをチェック
        if (!isSameDay(startTime, selectedDate)) return null;
      }

      // 日本の曜日（月曜始まり）に合わせて調整
      let dayOfWeek = startTime.getDay() - 1; // 0が月曜、6が日曜
      if (dayOfWeek < 0) dayOfWeek = 6; // 日曜日の場合

      // 週表示のときは各曜日の列に配置
      // 日表示のときは1列目に配置
      const colStart = viewMode === 'week' ? dayOfWeek + 1 : 1;

      const hours = startTime.getHours();
      const minutes = startTime.getMinutes();
      const startRow = hours * 24 + Math.floor(minutes / 2.5) + 2;

      const totalMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
      const rowSpan = Math.ceil(totalMinutes / 2.5);

      return (
        <li
          key={reservation._id}
          className="relative mt-px flex"
          style={{
            gridRow: `${startRow} / span ${rowSpan}`,
            gridColumn: `${colStart} / span 1`,
          }}
        >
          <a
            href={`/dashboard/reservation/${reservation._id}`}
            className="group absolute inset-1 flex flex-col overflow-y-auto rounded-lg bg-indigo-50 p-2 text-xs/5 hover:bg-indigo-100"
          >
            <p className="order-1 font-semibold text-indigo-700">{reservation.staffName}</p>
            <p className="text-indigo-500 group-hover:text-indigo-700">
              <time dateTime={startTime.toISOString()}>
                {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
              </time>
            </p>
            <p className="mt-1 text-indigo-700">¥{reservation.totalPrice?.toLocaleString()}</p>
          </a>
        </li>
      );
    });
  };

  // 24時間分の時間表示を生成する関数
  const renderTimeSlots = () => {
    const slots: React.ReactNode[] = [];

    for (let i = 0; i < 24; i++) {
      const hour = i;
      const ampm = hour < 12 ? 'AM' : 'PM';
      const hour12 = hour % 12 === 0 ? 12 : hour % 12;

      slots.push(
        <div key={`hour-${i}`}>
          <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs/5 text-gray-400">
            {hour12}
            {ampm}
          </div>
        </div>
      );
      slots.push(<div key={`hour-half-${i}`} />);
    }

    return slots;
  };

  // 前の日/週へ移動
  const moveToPrevious = (): void => {
    if (viewMode === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 7);
      setCurrentDate(newDate);
    } else {
      const newDate = new Date(selectedDate);
      newDate.setDate(selectedDate.getDate() - 1);
      setSelectedDate(newDate);
    }
  };

  // 次の日/週へ移動
  const moveToNext = (): void => {
    if (viewMode === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 7);
      setCurrentDate(newDate);
    } else {
      const newDate = new Date(selectedDate);
      newDate.setDate(selectedDate.getDate() + 1);
      setSelectedDate(newDate);
    }
  };

  // 今日/今週へ移動
  const moveToToday = (): void => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // 日表示と週表示の切り替え
  const toggleViewMode = (): void => {
    setViewMode(viewMode === 'week' ? 'day' : 'week');
  };

  return (
    <DashboardSection
      title="タイムライン"
      backLink="/dashboard/timeline"
      backLinkTitle="タイムラインに戻る"
    >
      <div>
        <div className="flex h-full flex-col">
          <div className="md:hidden flex flex-col gap-2 items-end justify-end">
            <div className="w-fit min-w-[180px]">
              <Select
                value={selectedStaffId ?? ''}
                onValueChange={(value) => setSelectedStaffId(value as Id<'staff'>)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="スタッフを選択" />
                </SelectTrigger>
                <SelectContent>
                  {staffs.results?.map((staff) => (
                    <SelectItem key={staff._id} value={staff._id}>
                      {staff.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <header className="flex flex-none items-center justify-between border-b border-gray-200 md:px-6 py-4">
            <h1 className="text-sm md:text-base font-semibold text-gray-900">
              {viewMode === 'week' ? (
                <time
                  dateTime={`${format(startOfWeek, 'yyyy-MM-dd')}/${format(endOfWeek, 'yyyy-MM-dd')}`}
                >
                  {format(startOfWeek, 'yyyy年MM月dd日', { locale: ja })}
                  <div className="md:hidden text-end mr-2 text-gray-500 text-xs">から</div>
                  {format(endOfWeek, 'yyyy年MM月dd日', { locale: ja })}
                </time>
              ) : (
                <time dateTime={format(selectedDate, 'yyyy-MM-dd')}>
                  {format(selectedDate, 'yyyy年MM月dd日', { locale: ja })}
                  <div className="md:hidden ml-2 inline-block text-gray-500 text-xs">
                    ({weekDaysFull[selectedDate.getDay() === 0 ? 6 : selectedDate.getDay() - 1]})
                  </div>
                </time>
              )}
            </h1>
            <div className="flex items-center">
              <div className="relative flex items-center rounded-md bg-white shadow-xs md:items-stretch">
                <button
                  type="button"
                  className="flex h-9 w-12 items-center justify-center rounded-l-md border-y border-l border-gray-300 pr-1 text-gray-400 hover:text-gray-500 focus:relative md:w-9 md:pr-0 md:hover:bg-gray-50"
                  onClick={moveToPrevious}
                >
                  <span className="sr-only">{viewMode === 'week' ? '前週' : '前日'}</span>
                  <ChevronLeft className="size-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="hidden border-y border-gray-300 px-3.5 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus:relative md:block"
                  onClick={moveToToday}
                >
                  今日
                </button>
                <span className="relative -mx-px h-5 w-px bg-gray-300 md:hidden" />
                <button
                  type="button"
                  className="flex h-9 w-12 items-center justify-center rounded-r-md border-y border-r border-gray-300 pl-1 text-gray-400 hover:text-gray-500 focus:relative md:w-9 md:pl-0 md:hover:bg-gray-50"
                  onClick={moveToNext}
                >
                  <span className="sr-only">{viewMode === 'week' ? '次週' : '翌日'}</span>
                  <ChevronRight className="size-5" aria-hidden="true" />
                </button>
              </div>
              <div className="hidden md:ml-4 md:flex md:flex-col md:items-center">
                <span className="text-sm text-gray-500">選択中のスタッフ</span>
                <Select
                  value={selectedStaffId ?? ''}
                  onValueChange={(value) => setSelectedStaffId(value as Id<'staff'>)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="スタッフを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffs.results?.map((staff) => (
                      <SelectItem key={staff._id} value={staff._id}>
                        {staff.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Menu as="div" className="relative ml-6 md:hidden">
                <MenuButton className="-mx-2 flex items-center rounded-full border border-transparent p-2 text-gray-400 hover:text-gray-500">
                  <span className="sr-only">メニューを開く</span>
                  <Ellipsis className="size-5" aria-hidden="true" />
                </MenuButton>

                <MenuItems
                  transition
                  className="absolute right-0 z-10 mt-3 w-36 origin-top-right divide-y divide-gray-100 overflow-hidden rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-hidden data-closed:scale-95 data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
                >
                  <div className="py-1">
                    <MenuItem>
                      <a
                        href="#"
                        className="block px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:text-gray-900 data-focus:outline-hidden"
                        onClick={moveToToday}
                      >
                        今日へ移動
                      </a>
                    </MenuItem>
                    <MenuItem>
                      <a
                        href="#"
                        className="block px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:text-gray-900 data-focus:outline-hidden"
                        onClick={toggleViewMode}
                      >
                        {viewMode === 'day' ? '週表示に切り替え' : '日表示に切り替え'}
                      </a>
                    </MenuItem>
                  </div>
                </MenuItems>
              </Menu>
            </div>
          </header>
          {reservations.length > 0 ? (
            <div ref={container} className="isolate flex flex-auto flex-col overflow-auto bg-white">
              <div
                style={{ width: viewMode === 'week' ? '165%' : '100%' }}
                className="flex max-w-full flex-none flex-col sm:max-w-none md:max-w-full"
              >
                <div
                  ref={containerNav}
                  className="sticky top-0 z-30 flex-none bg-white shadow-sm ring-1 ring-black/5 sm:pr-8"
                >
                  {/* 日付ヘッダー部分（モバイル） - 日本語化 */}
                  {viewMode === 'week' && (
                    <div className="grid grid-cols-7 text-sm/6 text-gray-500 sm:hidden">
                      {daysOfWeek.map((date, index) => {
                        const isToday = date.toDateString() === new Date().toDateString();
                        const isSelected = date.toDateString() === selectedDate.toDateString();
                        return (
                          <button
                            key={index}
                            type="button"
                            className="flex flex-col items-center pt-2 pb-3"
                            onClick={() => {
                              setSelectedDate(date);
                              setViewMode('day');
                            }}
                          >
                            {weekDays[index]}{' '}
                            <span
                              className={`mt-1 flex size-8 items-center justify-center ${
                                isToday
                                  ? 'rounded-full bg-indigo-600 font-semibold text-white'
                                  : isSelected
                                    ? 'rounded-full bg-indigo-100 font-semibold text-indigo-600'
                                    : 'font-semibold text-gray-900'
                              }`}
                            >
                              {date.getDate()}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {viewMode === 'day' && (
                    <div className="grid grid-cols-1 text-sm/6 text-gray-500 sm:hidden">
                      <div className="flex justify-center items-center pt-2 pb-3">
                        <span className="font-medium">
                          {
                            weekDaysFull[
                              selectedDate.getDay() === 0 ? 6 : selectedDate.getDay() - 1
                            ]
                          }
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 日付ヘッダー部分（デスクトップ） - 日本語化 */}
                  <div
                    className={`-mr-px hidden divide-x divide-gray-100 border-r border-gray-100 text-sm/6 text-gray-500 sm:grid ${
                      viewMode === 'week' ? 'grid-cols-7' : 'grid-cols-1'
                    }`}
                  >
                    <div className="col-end-1 w-14" />
                    {viewMode === 'week' ? (
                      daysOfWeek.map((date, index) => {
                        const isToday = date.toDateString() === new Date().toDateString();
                        return (
                          <div key={index} className="flex items-center justify-center py-3">
                            <span className={isToday ? 'flex items-baseline' : ''}>
                              {weekDaysFull[index].substring(0, 1)}{' '}
                              {isToday ? (
                                <span className="ml-1.5 flex size-8 items-center justify-center rounded-full bg-indigo-600 font-semibold text-white">
                                  {date.getDate()}
                                </span>
                              ) : (
                                <span className="items-center justify-center font-semibold text-gray-900">
                                  {date.getDate()}
                                </span>
                              )}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex items-center justify-center py-3">
                        <span className="font-medium">
                          {
                            weekDaysFull[
                              selectedDate.getDay() === 0 ? 6 : selectedDate.getDay() - 1
                            ]
                          }
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-auto">
                  <div className="sticky left-0 z-10 w-14 flex-none bg-white ring-1 ring-gray-100" />
                  <div className="grid flex-auto grid-cols-1 grid-rows-1">
                    {/* 時間の行 - 24時間分に修正 */}
                    <div
                      className="col-start-1 col-end-2 row-start-1 grid divide-y divide-gray-100"
                      style={{ gridTemplateRows: 'repeat(48, minmax(3.5rem, 1fr))' }}
                    >
                      <div ref={containerOffset} className="row-end-1 h-7"></div>
                      {renderTimeSlots()}
                    </div>

                    {/* gridの線 - 境界線を追加 */}
                    <div
                      className={`col-start-1 col-end-2 row-start-1 hidden grid-rows-1 divide-x divide-gray-100 sm:grid ${
                        viewMode === 'week'
                          ? 'grid-cols-7 sm:grid-cols-7'
                          : 'grid-cols-1 sm:grid-cols-1'
                      }`}
                    >
                      {viewMode === 'week' ? (
                        <>
                          <div className="col-start-1 row-span-full border-r border-gray-100" />
                          <div className="col-start-2 row-span-full border-r border-gray-100" />
                          <div className="col-start-3 row-span-full border-r border-gray-100" />
                          <div className="col-start-4 row-span-full border-r border-gray-100" />
                          <div className="col-start-5 row-span-full border-r border-gray-100" />
                          <div className="col-start-6 row-span-full border-r border-gray-100" />
                          <div className="col-start-7 row-span-full border-r border-gray-100" />
                          <div className="col-start-8 row-span-full w-8" />
                        </>
                      ) : (
                        <div className="col-start-1 row-span-full border-r border-gray-100" />
                      )}
                    </div>

                    {/* イベント表示エリア */}
                    <ol
                      className={`col-start-1 col-end-2 row-start-1 grid sm:pr-8 ${
                        viewMode === 'week'
                          ? 'grid-cols-1 sm:grid-cols-7'
                          : 'grid-cols-1 sm:grid-cols-1'
                      }`}
                      style={{ gridTemplateRows: '1.75rem repeat(576, minmax(0, 1fr)) auto' }}
                    >
                      {renderReservations()}
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto bg-gray-50">
              <div className="flex items-center justify-center h-full py-12 px-4 sm:px-6 lg:px-8">
                <p className="text-gray-500">スタッフを選択して予約を表示してください。</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardSection>
  );
}