'use client';

import { api } from '@/convex/_generated/api';
import { useSalon } from '@/hooks/useSalon';
import { usePaginatedQuery } from 'convex/react';
import { Loading } from '@/components/common';
import { formatJpTime, convertUnixTimeToDateString } from '@/lib/schedule';
import Link from 'next/link';
import { getMonth } from 'date-fns';
import { useMemo, memo, useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  ChevronRight,
  ClipboardCheck,
  CalendarDays,
  CalendarRange,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  endOfWeek,
  addDays,
  startOfMonth,
  endOfMonth,
  addMonths,
  isSameDay,
  isAfter,
  isWithinInterval,
  getYear,
} from 'date-fns';

import { Id } from '@/convex/_generated/dataModel';

// 予約ステータスの型定義
type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'refunded';

// 予約データの型定義
interface Reservation {
  _id: Id<'reservation'>;
  salonId: Id<'salon'>;
  staffId?: Id<'staff'>;
  staffName?: string;
  customerName?: string;
  startTime_unix?: number;
  endTime_unix?: number;
  totalPrice?: number;
  status?: ReservationStatus;
  isArchive?: boolean;
}

// 予約グループの型定義
enum ReservationGroup {
  TODAY = 'today',
  UPCOMING = 'upcoming',
  THIS_WEEK = 'this-week',
  NEXT_WEEK = 'next-week',
  THIS_MONTH = 'this-month',
  NEXT_MONTH = 'next-month',
  MONTH_AFTER_NEXT = 'month-after-next',
}

// グループタブの構成の型定義
interface GroupTabConfig {
  id: ReservationGroup;
  label: string;
  icon: React.ElementType;
  count: number;
}

// ステータス設定の型定義
interface StatusConfig {
  color: string;
  text: string;
}

// ステータスマッピング
const statusMap: Record<ReservationStatus, StatusConfig> = {
  pending: {
    color: 'bg-yellow-500 hover:bg-yellow-600',
    text: '未確認',
  },
  confirmed: {
    color: 'bg-green-500 hover:bg-green-600',
    text: '確認済み',
  },
  cancelled: {
    color: 'bg-red-500 hover:bg-red-600',
    text: 'キャンセル',
  },
  completed: {
    color: 'bg-blue-500 hover:bg-blue-600',
    text: '完了',
  },
  refunded: {
    color: 'bg-gray-500 hover:bg-gray-600',
    text: '返金',
  },
};

// 月の名前を取得する関数
const getMonthName = (month: number): string => {
  const monthNames = [
    '1月',
    '2月',
    '3月',
    '4月',
    '5月',
    '6月',
    '7月',
    '8月',
    '9月',
    '10月',
    '11月',
    '12月',
  ];
  return monthNames[month];
};

// メモ化された予約カード
interface ReservationCardProps {
  reservation: Reservation;
}

const ReservationCard: React.FC<ReservationCardProps> = memo(({ reservation }) => {
  const status = reservation.status || 'pending';

  return (
    <Link href={`/dashboard/reservation/${reservation._id}`} className="block w-full">
      <Card
        className="mb-3 hover:shadow-md transition-shadow duration-300 border-l-4"
        style={{ borderLeftColor: statusMap[status].color.split(' ')[0] }}
      >
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <Badge variant={'default'}>{statusMap[status].text}</Badge>
              <span className="text-sm font-medium flex items-center gap-1">
                <User className="h-3 w-3" />
                {reservation.customerName || '顧客名なし'}
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{convertUnixTimeToDateString(reservation.startTime_unix!)}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-indigo-600 font-medium">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {reservation.startTime_unix ? formatJpTime(reservation.startTime_unix) : '--:--'}
              {' 〜 '}
              {reservation.endTime_unix ? formatJpTime(reservation.endTime_unix) : '--:--'}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <ClipboardCheck className="h-3.5 w-3.5" />
              <span>{reservation.staffName || 'スタッフ未設定'}</span>
            </div>
            {reservation.totalPrice && (
              <span className="text-sm font-semibold">
                ¥{reservation.totalPrice.toLocaleString()}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
});

ReservationCard.displayName = 'ReservationCard';

// グループタブコンポーネントの型定義
interface GroupTabProps {
  id: string;
  label: string;
  count: number;
  icon: React.ElementType;
}

const GroupTab: React.FC<GroupTabProps> = memo(({ id, label, count, icon: Icon }) => (
  <TabsTrigger
    value={id}
    className="relative px-3 py-1.5 transition-all data-[state=active]:bg-indigo-50"
    style={{ minWidth: '100px' }}
  >
    <div className="flex items-center gap-1.5">
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </div>
    {count > 0 && (
      <span className="absolute -top-1 -right-1 h-5 w-5 text-xs flex items-center justify-center bg-indigo-600 text-white rounded-full">
        {count}
      </span>
    )}
  </TabsTrigger>
));

GroupTab.displayName = 'GroupTab';

export default function ReservationList() {
  const { salonId } = useSalon();
  const [activeTab, setActiveTab] = useState<string>(ReservationGroup.TODAY);

  const { results: reservations, isLoading } = usePaginatedQuery(
    api.reservation.query.findBySalonId,
    salonId
      ? {
          salonId,
        }
      : 'skip',
    {
      initialNumItems: 50,
    }
  );

  // 月の範囲を取得
  const monthRanges = useMemo<{ current: Date[]; next: Date[]; afterNext: Date[] }>(() => {
    const today = new Date();
    const currentMonth = {
      start: startOfMonth(today),
      end: endOfMonth(today),
    };

    const nextMonth = {
      start: startOfMonth(addMonths(today, 1)),
      end: endOfMonth(addMonths(today, 1)),
    };

    const monthAfterNext = {
      start: startOfMonth(addMonths(today, 2)),
      end: endOfMonth(addMonths(today, 2)),
    };

    return {
      current: [currentMonth.start, currentMonth.end],
      next: [nextMonth.start, nextMonth.end],
      afterNext: [monthAfterNext.start, monthAfterNext.end],
    };
  }, []);

  // 予約を論理的なグループごとにグループ化
  const groupedReservations = useMemo<Record<string, Reservation[]>>(() => {
    if (!reservations) return {};

    const sortedReservations = [...reservations].sort(
      (a, b) => (a.startTime_unix || 0) - (b.startTime_unix || 0)
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = addDays(today, 1);
    tomorrow.setHours(0, 0, 0, 0);

    // 今週の範囲

    const thisWeekEnd = endOfWeek(today, { weekStartsOn: 1 });

    // 来週の範囲
    const nextWeekStart = addDays(thisWeekEnd, 1);
    const nextWeekEnd = addDays(nextWeekStart, 6);

    // 現在月、翌月、翌々月
    const thisMonthStart = monthRanges.current[0];
    const thisMonthEnd = monthRanges.current[1];

    const nextMonthStart = monthRanges.next[0];
    const nextMonthEnd = monthRanges.next[1];

    const monthAfterNextStart = monthRanges.afterNext[0];
    const monthAfterNextEnd = monthRanges.afterNext[1];

    // 論理的なグループを初期化
    const groups: Record<string, Reservation[]> = {
      [ReservationGroup.TODAY]: [], // 今日
      [ReservationGroup.UPCOMING]: [], // 明日から今週末まで
      [ReservationGroup.THIS_WEEK]: [], // 今週全体（可視化用）
      [ReservationGroup.NEXT_WEEK]: [], // 来週
      [ReservationGroup.THIS_MONTH]: [], // 今月（今日以降）
      [ReservationGroup.NEXT_MONTH]: [], // 来月
      [ReservationGroup.MONTH_AFTER_NEXT]: [], // 再来月
    };

    // 予約を適切なグループに振り分け
    sortedReservations.forEach((reservation) => {
      if (!reservation.startTime_unix) return;

      const startDate = new Date(reservation.startTime_unix * 1000);
      startDate.setHours(0, 0, 0, 0);

      // 今日の予約
      if (isSameDay(startDate, today)) {
        groups[ReservationGroup.TODAY].push(reservation);
        groups[ReservationGroup.THIS_WEEK].push(reservation);
        groups[ReservationGroup.THIS_MONTH].push(reservation);
      }
      // 明日から今週末までの予約
      else if (
        isAfter(startDate, today) &&
        isWithinInterval(startDate, { start: tomorrow, end: thisWeekEnd })
      ) {
        groups[ReservationGroup.UPCOMING].push(reservation);
        groups[ReservationGroup.THIS_WEEK].push(reservation);
        groups[ReservationGroup.THIS_MONTH].push(reservation);
      }
      // 来週の予約
      else if (isWithinInterval(startDate, { start: nextWeekStart, end: nextWeekEnd })) {
        groups[ReservationGroup.NEXT_WEEK].push(reservation);

        // 来週が今月に含まれるかチェック
        if (isWithinInterval(startDate, { start: thisMonthStart, end: thisMonthEnd })) {
          groups[ReservationGroup.THIS_MONTH].push(reservation);
        }
        // 来週が来月に含まれるかチェック
        else if (isWithinInterval(startDate, { start: nextMonthStart, end: nextMonthEnd })) {
          groups[ReservationGroup.NEXT_MONTH].push(reservation);
        }
      }
      // 今月（今週と来週以外）の予約
      else if (
        isAfter(startDate, nextWeekEnd) &&
        isWithinInterval(startDate, { start: thisMonthStart, end: thisMonthEnd })
      ) {
        groups[ReservationGroup.THIS_MONTH].push(reservation);
      }
      // 来月の予約
      else if (isWithinInterval(startDate, { start: nextMonthStart, end: nextMonthEnd })) {
        groups[ReservationGroup.NEXT_MONTH].push(reservation);
      }
      // 再来月の予約
      else if (
        isWithinInterval(startDate, { start: monthAfterNextStart, end: monthAfterNextEnd })
      ) {
        groups[ReservationGroup.MONTH_AFTER_NEXT].push(reservation);
      }
    });

    return groups;
  }, [reservations, monthRanges]);

  // グループごとの予約数を計算
  const groupCounts = useMemo<Record<string, number>>(() => {
    if (!groupedReservations) return {};

    const counts: Record<string, number> = {};
    Object.keys(groupedReservations).forEach((group) => {
      counts[group] = groupedReservations[group]?.length || 0;
    });

    return counts;
  }, [groupedReservations]);

  // アクティブタブを決定
  useEffect(() => {
    if (!groupedReservations) return;

    // 優先順位: 今日 > 今週 > 来週 > 今月 > 来月 > 再来月
    if (groupCounts[ReservationGroup.TODAY] > 0) {
      setActiveTab(ReservationGroup.TODAY);
    } else if (groupCounts[ReservationGroup.UPCOMING] > 0) {
      setActiveTab(ReservationGroup.UPCOMING);
    } else if (groupCounts[ReservationGroup.NEXT_WEEK] > 0) {
      setActiveTab(ReservationGroup.NEXT_WEEK);
    } else if (groupCounts[ReservationGroup.THIS_MONTH] > 0) {
      setActiveTab(ReservationGroup.THIS_MONTH);
    } else if (groupCounts[ReservationGroup.NEXT_MONTH] > 0) {
      setActiveTab(ReservationGroup.NEXT_MONTH);
    } else if (groupCounts[ReservationGroup.MONTH_AFTER_NEXT] > 0) {
      setActiveTab(ReservationGroup.MONTH_AFTER_NEXT);
    } else {
      setActiveTab(ReservationGroup.TODAY); // デフォルト
    }
  }, [groupedReservations, groupCounts]);

  if (isLoading) return <Loading />;

  // 現在月、翌月、翌々月の名前を取得
  const today = new Date();
  const currentMonthName = `${getYear(today)}年${getMonthName(getMonth(today))}`;
  const nextMonthName = `${getYear(addMonths(today, 1))}年${getMonthName(getMonth(addMonths(today, 1)))}`;
  const monthAfterNextName = `${getYear(addMonths(today, 2))}年${getMonthName(getMonth(addMonths(today, 2)))}`;

  // タブ構成を生成
  const groupConfigs: GroupTabConfig[] = [
    {
      id: ReservationGroup.TODAY,
      label: '今日',
      icon: Calendar,
      count: groupCounts[ReservationGroup.TODAY] || 0,
    },
    {
      id: ReservationGroup.UPCOMING,
      label: '今週',
      icon: CalendarRange,
      count: groupCounts[ReservationGroup.UPCOMING] || 0,
    },
    {
      id: ReservationGroup.NEXT_WEEK,
      label: '来週',
      icon: CalendarDays,
      count: groupCounts[ReservationGroup.NEXT_WEEK] || 0,
    },
    {
      id: ReservationGroup.THIS_MONTH,
      label: currentMonthName,
      icon: CalendarDays,
      count: groupCounts[ReservationGroup.THIS_MONTH] || 0,
    },
    {
      id: ReservationGroup.NEXT_MONTH,
      label: nextMonthName,
      icon: CalendarDays,
      count: groupCounts[ReservationGroup.NEXT_MONTH] || 0,
    },
    {
      id: ReservationGroup.MONTH_AFTER_NEXT,
      label: monthAfterNextName,
      icon: CalendarDays,
      count: groupCounts[ReservationGroup.MONTH_AFTER_NEXT] || 0,
    },
  ].filter((group) => group.count > 0 || group.id === ReservationGroup.TODAY);

  // グループ名を表示用に変換
  const getGroupDisplayName = (groupId: ReservationGroup): string => {
    switch (groupId) {
      case ReservationGroup.TODAY:
        return '今日の予約';
      case ReservationGroup.UPCOMING:
        return '今週の予約（明日〜週末）';
      case ReservationGroup.NEXT_WEEK:
        return '来週の予約';
      case ReservationGroup.THIS_MONTH:
        return `${currentMonthName}の予約`;
      case ReservationGroup.NEXT_MONTH:
        return `${nextMonthName}の予約`;
      case ReservationGroup.MONTH_AFTER_NEXT:
        return `${monthAfterNextName}の予約`;
      default:
        return `${groupId}の予約`;
    }
  };

  return (
    <div className="w-full my-4">
      <Card className="border-0 shadow-none">
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="mb-4 overflow-x-auto pb-1">
              <TabsList className="w-full justify-start bg-muted/50 p-1">
                {groupConfigs.map((group) => (
                  <GroupTab
                    key={group.id}
                    id={group.id}
                    label={group.label}
                    count={group.count}
                    icon={group.icon}
                  />
                ))}
              </TabsList>
            </div>

            {groupConfigs.map((group) => (
              <TabsContent key={group.id} value={group.id} className="mt-0">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <group.icon className="h-5 w-5 text-indigo-500" />
                      {getGroupDisplayName(group.id as ReservationGroup)} (
                      {groupedReservations[group.id]?.length || 0}件)
                    </CardTitle>
                  </CardHeader>

                  <ScrollArea className="h-[calc(100vh-340px)] px-4">
                    {groupedReservations[group.id]?.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">予約はありません</div>
                    ) : (
                      groupedReservations[group.id]?.map((reservation) => (
                        <ReservationCard key={reservation._id} reservation={reservation} />
                      ))
                    )}
                  </ScrollArea>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}