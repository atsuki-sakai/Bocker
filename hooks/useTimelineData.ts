'use client'

import { useMemo } from 'react'
import { usePaginatedQuery, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id, Doc } from '@/convex/_generated/dataModel'
import { 
  convertTimestampToHour, 
  hourToMinutes, 
  getMinuteMultiples, 
  toHourString
} from '@/lib/schedules'

// ■ 型定義
interface StaffTimelineData {
  staff: Doc<'staff'>
  reservations: ReservationWithDetails[]
  schedules: StaffSchedule[]
}

interface ReservationWithDetails {
  _id: Id<'reservation'>
  staff_id: Id<'staff'>
  staff_name: string
  customer_name: string
  start_time_unix: number
  end_time_unix: number
  status: string
  date: string
}

interface StaffSchedule {
  start_time_unix: number
  end_time_unix: number
  type: string
  is_all_day: boolean
}

interface TimeSlot {
  index: number
  timeLabel: string
  minutes: number
}

interface ReservationBar {
  reservation: ReservationWithDetails
  startColumn: number
  spanColumns: number
  color: string
}

interface ScheduleBar {
  schedule: StaffSchedule
  startColumn: number
  spanColumns: number
  color: string
  type: 'break' | 'holiday' | 'work'
}

interface UseTimelineDataProps {
  tenantId: Id<'tenant'> | null
  orgId: Id<'organization'> | null
  date: string
  ready: boolean
}

interface UseTimelineDataReturn {
  staffTimelineData: StaffTimelineData[]
  timeSlots: TimeSlot[]
  totalReservations: number
  activeStaffCount: number
  isLoading: boolean
}

// ■ 定数
const TIME_SLOT_MINUTES = 10
const TOTAL_MINUTES_PER_DAY = 24 * 60
const RESERVATION_COLORS = {
  confirmed: 'bg-blue-100 border-blue-300 text-blue-800',
  pending: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  cancelled: 'bg-red-100 border-red-300 text-red-800',
  completed: 'bg-green-100 border-green-300 text-green-800',
} as const

const SCHEDULE_COLORS = {
  break: 'bg-gray-100 border-gray-300 text-gray-800',
  holiday: 'bg-red-50 border-red-200 text-red-700',
  work: 'bg-green-50 border-green-200 text-green-700',
} as const

// ■ ユーティリティ関数
const generateTimeSlots = (): TimeSlot[] => {
  const minutes = getMinuteMultiples(TIME_SLOT_MINUTES, TOTAL_MINUTES_PER_DAY - TIME_SLOT_MINUTES)
  return minutes.map((min, index) => ({
    index,
    timeLabel: toHourString(min),
    minutes: min,
  }))
}

const calculateReservationBar = (reservation: ReservationWithDetails): ReservationBar => {
  const startHour = convertTimestampToHour(reservation.start_time_unix)
  const endHour = convertTimestampToHour(reservation.end_time_unix)
  
  const startMinutes = hourToMinutes(startHour)
  const endMinutes = hourToMinutes(endHour)
  
  const startColumn = Math.floor(startMinutes / TIME_SLOT_MINUTES)
  const endColumn = Math.ceil(endMinutes / TIME_SLOT_MINUTES)
  const spanColumns = endColumn - startColumn
  
  return {
    reservation,
    startColumn,
    spanColumns,
    color: RESERVATION_COLORS[reservation.status as keyof typeof RESERVATION_COLORS] || RESERVATION_COLORS.pending,
  }
}

const calculateScheduleBar = (schedule: StaffSchedule): ScheduleBar => {
  // 終日スケジュールの場合は全日表示
  if (schedule.is_all_day) {
    return {
      schedule,
      startColumn: 0,
      spanColumns: 144, // 24時間 × 6（10分刻み）
      color: SCHEDULE_COLORS[schedule.type as keyof typeof SCHEDULE_COLORS] || SCHEDULE_COLORS.break,
      type: schedule.type as 'break' | 'holiday' | 'work',
    }
  }

  const startHour = convertTimestampToHour(schedule.start_time_unix)
  const endHour = convertTimestampToHour(schedule.end_time_unix)
  
  const startMinutes = hourToMinutes(startHour)
  const endMinutes = hourToMinutes(endHour)
  
  const startColumn = Math.floor(startMinutes / TIME_SLOT_MINUTES)
  const endColumn = Math.ceil(endMinutes / TIME_SLOT_MINUTES)
  const spanColumns = endColumn - startColumn
  
  return {
    schedule,
    startColumn,
    spanColumns,
    color: SCHEDULE_COLORS[schedule.type as keyof typeof SCHEDULE_COLORS] || SCHEDULE_COLORS.break,
    type: schedule.type as 'break' | 'holiday' | 'work',
  }
}

// ■ メインフック
export function useTimelineData({
  tenantId,
  orgId,
  date,
  ready
}: UseTimelineDataProps): UseTimelineDataReturn {
  
  // スタッフ一覧の取得（ページネーション対応）
  const staffList = usePaginatedQuery(
    api.staff.query.list,
    ready && tenantId && orgId 
      ? { 
          tenant_id: tenantId, 
          org_id: orgId,
          sort: 'asc'
        } 
      : 'skip',
    { initialNumItems: 100 } // スタッフ数に応じて調整
  )

  // 指定日の予約一覧の取得（ページネーション対応）
  const reservations = usePaginatedQuery(
    api.reservation.query.listByDate,
    ready && tenantId && orgId 
      ? { 
          tenant_id: tenantId, 
          org_id: orgId, 
          date,
          sort: 'asc'
        } 
      : 'skip',
    { initialNumItems: 500 } // 予約数に応じて調整
  )

  // 時間スロットの生成（メモ化）
  const timeSlots = useMemo(() => generateTimeSlots(), [])

  // スタッフ別のタイムラインデータの計算（メモ化）
  const staffTimelineData = useMemo(() => {
    if (!staffList?.results || !reservations?.results) return []
    
    // アクティブなスタッフのみフィルタリング
    const activeStaffs = staffList.results.filter(
      staff => staff.is_active && !staff.is_archive
    )

    // 確定済み予約のみフィルタリング
    const confirmedReservations = reservations.results.filter(
      res => res.status === 'confirmed' && !res.is_archive
    ) as ReservationWithDetails[]

    // スタッフIDでグループ化（パフォーマンス最適化）
    const reservationsByStaff = confirmedReservations.reduce((acc, reservation) => {
      const staffId = reservation.staff_id
      if (!acc[staffId]) {
        acc[staffId] = []
      }
      acc[staffId].push(reservation)
      return acc
    }, {} as Record<string, ReservationWithDetails[]>)

    // スタッフごとのタイムラインデータを構築
    // スケジュールは後で個別に取得するため、ここでは空配列
    return activeStaffs.map(staff => ({
      staff,
      reservations: reservationsByStaff[staff._id] || [],
      schedules: [], // 個別取得するため空配列
    }))
  }, [staffList?.results, reservations?.results])

  // 統計情報の計算（メモ化）
  const totalReservations = useMemo(() => 
    reservations?.results?.length || 0,
    [reservations?.results]
  )

  const activeStaffCount = useMemo(() => 
    staffTimelineData.length,
    [staffTimelineData]
  )

  // ローディング状態の判定
  const isLoading = useMemo(() => 
    !staffList || !reservations || staffList.isLoading || reservations.isLoading,
    [staffList, reservations]
  )

  return {
    staffTimelineData,
    timeSlots,
    totalReservations,
    activeStaffCount,
    isLoading,
  }
}

// ■ 予約バー計算用フック
export function useReservationBars(reservations: ReservationWithDetails[]): ReservationBar[] {
  return useMemo(() => 
    reservations.map(calculateReservationBar),
    [reservations]
  )
}

// ■ スケジュールバー計算用フック
export function useScheduleBars(schedules: StaffSchedule[]): ScheduleBar[] {
  return useMemo(() => 
    schedules.map(calculateScheduleBar),
    [schedules]
  )
}

// ■ 個別スタッフのスケジュール取得フック
export function useStaffSchedules(
  tenantId: Id<'tenant'> | null,
  orgId: Id<'organization'> | null,
  staffId: Id<'staff'>,
  date: string,
  ready: boolean
): StaffSchedule[] {
  
  // 特定のスタッフ・日付のスケジュール取得
  const scheduleData = useQuery(
    api.staff.exception_schedule.query.getByTenantOrgStaffAndDate,
    ready && tenantId && orgId 
      ? {
          tenant_id: tenantId,
          org_id: orgId,
          staff_id: staffId,
          date
        }
      : 'skip'
  )

  return useMemo(() => {
    if (!scheduleData) return []
    
    return [{
      start_time_unix: scheduleData.start_time_unix || 0,
      end_time_unix: scheduleData.end_time_unix || 0,
      type: scheduleData.type,
      is_all_day: scheduleData.is_all_day,
    }]
  }, [scheduleData])
}

// ■ エクスポート用の型と定数
export type {
  StaffTimelineData,
  ReservationWithDetails,
  StaffSchedule,
  TimeSlot,
  ReservationBar,
  ScheduleBar
}

export {
  TIME_SLOT_MINUTES,
  RESERVATION_COLORS,
  SCHEDULE_COLORS,
  calculateReservationBar,
  calculateScheduleBar
} 