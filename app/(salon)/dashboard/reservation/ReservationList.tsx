'use client';

import { api } from '@/convex/_generated/api';
import { useSalon } from '@/hooks/useSalon';
import { usePaginatedQuery } from 'convex/react';
import { Loading } from '@/components/common';
import { formatJpTime, convertUnixTimeToDateString } from '@/lib/schedule';
import Link from 'next/link';
import { Label } from '@/components/ui/label'
import { useMemo, memo, useState, useEffect } from 'react'
import {
  Calendar,
  Clock,
  User,
  ChevronRight,
  ClipboardCheck,
  CalendarDays,
  CalendarRange,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addMonths,
  startOfDay,
  endOfDay,
  startOfWeek,
  addWeeks,
  isWithinInterval,
  getYear,
  getMonth,
} from 'date-fns'

import { Id } from '@/convex/_generated/dataModel'
import {
  RESERVATION_STATUS_VALUES,
  convertReservationStatus,
} from '@/services/convex/shared/types/common'

// 予約ステータスの型定義
type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'refunded'

// 予約データの型定義
interface Reservation {
  _id: Id<'reservation'>
  salonId: Id<'salon'>
  staffId?: Id<'staff'>
  staffName?: string
  customerName?: string
  startTime_unix?: number
  endTime_unix?: number
  totalPrice?: number
  status?: ReservationStatus
  isArchive?: boolean
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
  id: ReservationGroup
  label: string
  icon: React.ElementType
  count: number
}

// ステータス設定の型定義
interface StatusConfig {
  color: string
  text: string
}

// ステータスマッピング
const statusMap: Record<ReservationStatus, StatusConfig> = {
  pending: {
    color: 'bg-warning-foreground text-warning ',
    text: '保留',
  },
  confirmed: {
    color: 'bg-palette-2-foreground text-palette-2 ',
    text: '予約確定',
  },
  cancelled: {
    color: 'bg-palette-4-foreground text-palette-4 ',
    text: 'キャンセル',
  },
  completed: {
    color: 'bg-palette-5-foreground text-palette-5 ',
    text: '完了',
  },
  refunded: {
    color: 'bg-palette-3-foreground text-palette-3 ',
    text: '返金',
  },
}

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
  ]
  return monthNames[month]
}

// メモ化された予約カード
interface ReservationCardProps {
  reservation: Reservation
}

const ReservationCard: React.FC<ReservationCardProps> = memo(({ reservation }) => {
  const status = reservation.status || 'pending'

  return (
    <Link href={`/dashboard/reservation/${reservation._id}`} className="block w-full">
      <Card
        className="mb-4 bg-muted hover:shadow-md transition-shadow duration-300"
        style={{ borderLeftColor: statusMap[status].color.split(' ')[0] }}
      >
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <Badge className={statusMap[status].color}>{statusMap[status].text}</Badge>
              <span className="text-sm font-medium flex items-center gap-1">
                <User className="h-3 w-3" />
                {reservation.customerName ? reservation.customerName : '顧客名なし'}
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="flex items-center gap-2 text-sm text-primary mb-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{convertUnixTimeToDateString(reservation.startTime_unix!)}</span>
          </div>

          <div className="flex items-center gap-2 text-base text-link-foreground font-semibold">
            <Clock className="h-4 w-4" />
            <span>
              {reservation.startTime_unix ? formatJpTime(reservation.startTime_unix) : '--:--'}
              {' 〜 '}
              {reservation.endTime_unix ? formatJpTime(reservation.endTime_unix) : '--:--'}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm text-primary">
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
  )
})

ReservationCard.displayName = 'ReservationCard'

// グループタブコンポーネントの型定義
interface GroupTabProps {
  id: string
  label: string
  count: number
  icon: React.ElementType
}

const GroupTab: React.FC<GroupTabProps> = memo(({ id, label, count, icon: Icon }) => (
  <TabsTrigger
    value={id}
    className="relative px-3 py-1.5 transition-all"
    style={{ minWidth: '100px' }}
  >
    <div className="flex items-center gap-1.5">
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </div>
    {count > 0 && (
      <span className="absolute -top-1 -right-1 h-6 w-6 text-xs flex items-center justify-center bg-background border border-border text-active rounded-full">
        {count}
      </span>
    )}
  </TabsTrigger>
))

GroupTab.displayName = 'GroupTab'

export default function ReservationList() {
  const { salonId } = useSalon()
  const [activeTab, setActiveTab] = useState<string>(ReservationGroup.TODAY)
  const [currentStatus, setCurrentStatus] = useState<ReservationStatus>('confirmed')

  const { results: reservations, isLoading } = usePaginatedQuery(
    api.reservation.query.findBySalonId,
    salonId
      ? {
          salonId,
          status: currentStatus,
        }
      : 'skip',
    {
      initialNumItems: 100,
    }
  )

  // --- 1) グループ分け ----
  const groupedReservations = useMemo<Record<ReservationGroup, Reservation[]>>(() => {
    if (!reservations)
      return {
        today: [],
        upcoming: [],
        'next-week': [],
        'this-week': [],
        'this-month': [],
        'next-month': [],
        'month-after-next': [],
      } as Record<ReservationGroup, Reservation[]>

    // 境界日をすべて先に計算
    const now = new Date()
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)

    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 })
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 })

    const nextWeekStart = addWeeks(thisWeekStart, 1)
    const nextWeekEnd = addWeeks(thisWeekEnd, 1)

    const thisMonthStart = startOfMonth(now)
    const thisMonthEnd = endOfMonth(now)
    const nextMonthStart = startOfMonth(addMonths(now, 1))
    const nextMonthEnd = endOfMonth(addMonths(now, 1))
    const monthAfterNextStart = startOfMonth(addMonths(now, 2))
    const monthAfterNextEnd = endOfMonth(addMonths(now, 2))

    // 初期化
    const groups: Record<ReservationGroup, Reservation[]> = {
      today: [],
      upcoming: [],
      'next-week': [],
      'this-week': [],
      'this-month': [],
      'next-month': [],
      'month-after-next': [],
    }

    reservations.forEach((r) => {
      if (!r.startTime_unix) return

      // UNIX 秒なら *1000 に変換
      const startDate = new Date(
        r.startTime_unix > 3_000_000_000 ? r.startTime_unix : r.startTime_unix * 1000
      )

      if (isWithinInterval(startDate, { start: todayStart, end: todayEnd })) {
        groups.today.push(r)
      } else if (isWithinInterval(startDate, { start: todayEnd, end: thisWeekEnd })) {
        groups.upcoming.push(r)
      } else if (isWithinInterval(startDate, { start: nextWeekStart, end: nextWeekEnd })) {
        groups['next-week'].push(r)
      } else if (isWithinInterval(startDate, { start: thisMonthStart, end: thisMonthEnd })) {
        groups['this-month'].push(r)
      } else if (isWithinInterval(startDate, { start: nextMonthStart, end: nextMonthEnd })) {
        groups['next-month'].push(r)
      } else if (
        isWithinInterval(startDate, {
          start: monthAfterNextStart,
          end: monthAfterNextEnd,
        })
      ) {
        groups['month-after-next'].push(r)
      }
    })

    return groups
  }, [reservations])

  // グループごとの予約数を計算
  const groupCounts = useMemo<Record<string, number>>(() => {
    if (!groupedReservations) return {}

    const counts: Record<string, number> = {}
    Object.keys(groupedReservations).forEach((group) => {
      counts[group] = groupedReservations[group as ReservationGroup]?.length || 0
    })

    return counts
  }, [groupedReservations])

  // アクティブタブを決定
  useEffect(() => {
    if (!groupedReservations) return

    // 優先順位: 今日 > 今週 > 来週 > 今月 > 来月 > 再来月
    if (groupCounts[ReservationGroup.TODAY] > 0) {
      setActiveTab(ReservationGroup.TODAY)
    } else if (groupCounts[ReservationGroup.UPCOMING] > 0) {
      setActiveTab(ReservationGroup.UPCOMING)
    } else if (groupCounts[ReservationGroup.NEXT_WEEK] > 0) {
      setActiveTab(ReservationGroup.NEXT_WEEK)
    } else if (groupCounts[ReservationGroup.THIS_MONTH] > 0) {
      setActiveTab(ReservationGroup.THIS_MONTH)
    } else if (groupCounts[ReservationGroup.NEXT_MONTH] > 0) {
      setActiveTab(ReservationGroup.NEXT_MONTH)
    } else if (groupCounts[ReservationGroup.MONTH_AFTER_NEXT] > 0) {
      setActiveTab(ReservationGroup.MONTH_AFTER_NEXT)
    } else {
      setActiveTab(ReservationGroup.TODAY) // デフォルト
    }
  }, [groupedReservations, groupCounts])

  if (isLoading) return <Loading />

  // 現在月、翌月、翌々月の名前を取得
  const today = new Date()
  const currentMonthName = `${getYear(today)}年${getMonthName(getMonth(today))}`
  const nextMonthName = `${getYear(addMonths(today, 1))}年${getMonthName(getMonth(addMonths(today, 1)))}`
  const monthAfterNextName = `${getYear(addMonths(today, 2))}年${getMonthName(getMonth(addMonths(today, 2)))}`

  // タブ構成を生成
  // --- 2) タブ定義 ----
  const groupConfigs: GroupTabConfig[] = [
    { id: ReservationGroup.TODAY, label: '今日', icon: Calendar, count: groupCounts.today },
    {
      id: ReservationGroup.UPCOMING,
      label: '今週',
      icon: CalendarRange,
      count: groupCounts.upcoming,
    },
    {
      id: ReservationGroup.NEXT_WEEK,
      label: '来週',
      icon: CalendarDays,
      count: groupCounts['next-week'],
    },
    {
      id: ReservationGroup.THIS_MONTH,
      label: currentMonthName,
      icon: CalendarDays,
      count: groupCounts['this-month'],
    },
    {
      id: ReservationGroup.NEXT_MONTH,
      label: nextMonthName,
      icon: CalendarDays,
      count: groupCounts['next-month'],
    },
    {
      id: ReservationGroup.MONTH_AFTER_NEXT,
      label: monthAfterNextName,
      icon: CalendarDays,
      count: groupCounts['month-after-next'],
    },
  ].filter((g) => g.count > 0 || g.id === ReservationGroup.TODAY)

  // グループ名を表示用に変換
  const getGroupDisplayName = (groupId: ReservationGroup): string => {
    switch (groupId) {
      case ReservationGroup.TODAY:
        return '今日の予約'
      case ReservationGroup.UPCOMING:
        return '今週の予約（明日〜週末）'
      case ReservationGroup.NEXT_WEEK:
        return '来週の予約'
      case ReservationGroup.THIS_MONTH:
        return `${currentMonthName}の予約`
      case ReservationGroup.NEXT_MONTH:
        return `${nextMonthName}の予約`
      case ReservationGroup.MONTH_AFTER_NEXT:
        return `${monthAfterNextName}の予約`
      default:
        return `${groupId}の予約`
    }
  }

  return (
    <div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-end mb-2">
          <div className="w-fit min-w-[180px]">
            <Label className="mb-2 text-xs">予約ステータス</Label>
            <Select
              value={currentStatus}
              onValueChange={(value) => setCurrentStatus(value as ReservationStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="予約ステータス" />
              </SelectTrigger>
              <SelectContent>
                {RESERVATION_STATUS_VALUES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {convertReservationStatus(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mb-4 overflow-x-auto pb-1">
          <TabsList className="flex justify-start w-fit gap-2 p-1">
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
            <div className="py-2 px-4">
              <div className="text-xl text-primary flex items-center gap-2">
                <h5 className="font-semibold">
                  {getGroupDisplayName(group.id as ReservationGroup)} (
                  {groupedReservations[group.id]?.length || 0}件)
                </h5>
              </div>
            </div>

            <div className="h-full px-4">
              {groupedReservations[group.id]?.length === 0 ? (
                <div className="text-center py-8 bg-muted text-muted-foreground rounded-md p-4 mb-4">
                  予約はありません。
                </div>
              ) : (
                Object.entries(
                  groupedReservations[group.id]!.reduce<Record<string, Reservation[]>>((acc, r) => {
                    // 日付 (YYYY/MM/DD) ごとにグループ化
                    const dateKey = convertUnixTimeToDateString(r.startTime_unix!)
                    if (!acc[dateKey]) acc[dateKey] = []
                    acc[dateKey].push(r)
                    return acc
                  }, {})
                ).map(([dateKey, resArray]) => (
                  <div key={dateKey} className="mb-2">
                    {/* sticky 日付ヘッダー */}
                    <div className="sticky top-0 z-10 backdrop-blur-sm py-1 px-1 text-base mt-4 font-semibold text-primary  mb-2 ">
                      {dateKey}
                    </div>

                    {/* その日の予約カード */}
                    {resArray.map((reservation) => (
                      <ReservationCard key={reservation._id} reservation={reservation} />
                    ))}
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}