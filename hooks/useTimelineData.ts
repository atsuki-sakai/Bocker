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

export interface TimelineSchedule {
    tenant_id: Id<'tenant'>
    org_id: Id<'organization'>
    staff_id: Id<'staff'> | null
    date: string
    scheduled_by: "staff" | "organization"
    is_all_day?: boolean | null
    start_time_unix?: number | null
    end_time_unix?: number | null
}
interface StaffTimelineData {
  staff: Doc<'staff'>
  reservations: ReservationWithDetails[]
  schedules: TimelineSchedule[]
}

interface ReservationWithDetails {
  _id: Id<'reservation'>
  staff_id: Id<'staff'> | null
  assigned_staff_id?: Id<'staff'>  // フリー指名の場合に使用
  is_free_nomination?: boolean     // フリー指名フラグ
  customer_uid?: string  // Supabase側のcustomer.uid (UUID) - オプショナルフィールド
  staff_name: string
  customer_name: string
  start_time_unix: number
  end_time_unix: number
  status: string
  date: string
  note?: string
}

interface StaffSchedule {
  start_time_unix: number
  end_time_unix: number
  type: string
  is_all_day: boolean
}

interface OrganizationSchedule {
  type: string
  date: string
  is_all_day: true // 組織スケジュールは常に全日
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


interface ReservationBar {
  reservation: ReservationWithDetails
  startColumn: number
  spanColumns: number
  color: string
}

interface ScheduleBar {
  schedule: StaffSchedule | OrganizationSchedule
  startColumn: number
  spanColumns: number
  color: string
  type: 'break' | 'holiday' | 'work'
  source: 'staff' | 'organization'
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
  isLoading: boolean
  schedules: TimelineSchedule[]
}

// ■ 定数
const TIME_SLOT_MINUTES = 10
const TOTAL_MINUTES_PER_DAY = 24 * 60
const RESERVATION_COLORS = {
  confirmed: 'bg-link text-link-foreground',
  pending: 'bg-warning text-warning-foreground',
  cancelled: 'bg-destructive text-destructive-foreground',
  completed: 'bg-success text-success-foreground',
} as const

const FREE_NOMINATION_COLORS = {
  confirmed: 'bg-palette-5 text-palette-5-foreground',
  pending: 'bg-warning text-warning-foreground',
  cancelled: 'bg-destructive text-destructive-foreground',
  completed: 'bg-success text-success-foreground',
} as const

const SCHEDULE_COLORS = {
  break: 'bg-muted text-muted-foreground',
  holiday: 'bg-destructive text-destructive-foreground',
  work: 'bg-success text-success-foreground',
} as const

const ORGANIZATION_SCHEDULE_COLORS = {
  break: 'bg-orange-200 text-orange-800',
  holiday: 'bg-red-200 text-red-800',
  work: 'bg-blue-200 text-blue-800',
} as const

// ■ ユーティリティ関数
/**
 * 1日のタイムスロットを生成する（10分刻み）
 * @returns 5:00から翌日5:00までのタイムスロット配列
 */
const generateTimeSlots = (): TimeSlot[] => {
  const START_HOUR = 5 // 5時から開始
  const START_MINUTES = START_HOUR * 60 // 300分
  const minutes = getMinuteMultiples(TIME_SLOT_MINUTES, TOTAL_MINUTES_PER_DAY - TIME_SLOT_MINUTES)
  
  return minutes.map((min, index) => {
    // 5時を起点とした分数に変換（5時 = 0分として扱う）
    const adjustedMinutes = (min + START_MINUTES) % TOTAL_MINUTES_PER_DAY
    return {
      index,
      timeLabel: toHourString(adjustedMinutes),
      minutes: adjustedMinutes,
    }
  })
}

/**
 * 予約データからタイムライン上の表示位置と幅を計算する
 * @param reservation - 予約情報
 * @returns タイムライン表示用のバー情報
 */
const calculateReservationBar = (reservation: ReservationWithDetails): ReservationBar => {
  const START_HOUR = 5 // 5時から開始（generateTimeSlotsと統一）
  const START_MINUTES = START_HOUR * 60 // 300分
  
  const startHour = convertTimestampToHour(reservation.start_time_unix)
  const endHour = convertTimestampToHour(reservation.end_time_unix)
  
  const startMinutes = hourToMinutes(startHour)
  const endMinutes = hourToMinutes(endHour)
  
  // 5時を起点として調整（5時 = 0列目）
  const adjustedStartMinutes = (startMinutes - START_MINUTES + TOTAL_MINUTES_PER_DAY) % TOTAL_MINUTES_PER_DAY
  const adjustedEndMinutes = (endMinutes - START_MINUTES + TOTAL_MINUTES_PER_DAY) % TOTAL_MINUTES_PER_DAY
  
  const startColumn = Math.floor(adjustedStartMinutes / TIME_SLOT_MINUTES)
  const endColumn = Math.ceil(adjustedEndMinutes / TIME_SLOT_MINUTES)
  const spanColumns = endColumn - startColumn
  
  // フリー指名予約の場合は専用色を使用
  const colorSet = reservation.is_free_nomination ? FREE_NOMINATION_COLORS : RESERVATION_COLORS
  
  return {
    reservation,
    startColumn,
    spanColumns,
    color: colorSet[reservation.status as keyof typeof colorSet] || colorSet.pending,
  }
}

/**
 * スケジュールデータからタイムライン上の表示位置と幅を計算する
 * @param schedule - スケジュール情報
 * @param source - スケジュールの種別（staff or organization）
 * @returns タイムライン表示用のバー情報
 */
const calculateScheduleBar = (
  schedules: TimelineSchedule[],
): ScheduleBar[] => {
  if (!schedules) return []
  const scheduleBars: ScheduleBar[] = []
  schedules.forEach(schedule => {
    if (schedule.scheduled_by === 'organization') {
      const colorSet = ORGANIZATION_SCHEDULE_COLORS
      scheduleBars.push({
        schedule: {
          type: 'holiday',
          date: schedule.date,
          is_all_day: true,
        } as OrganizationSchedule,
        startColumn: 0,
        spanColumns: 144, // 24時間 × 6（10分刻み）
        color: colorSet.holiday,
        type: 'holiday',
        source: 'organization',
      })
    } else if (schedule.is_all_day) {
      const colorSet = SCHEDULE_COLORS
      scheduleBars.push({
        schedule: {
          type: 'holiday',
          is_all_day: schedule.is_all_day,
          start_time_unix: schedule.start_time_unix || 0,
          end_time_unix: schedule.end_time_unix || 0,
        } as StaffSchedule,
        startColumn: 0,
        spanColumns: 144, // 24時間 × 6（10分刻み）
        color: colorSet.holiday,
        type: 'holiday',
        source: schedule.scheduled_by,
      })
    } else {
      const START_HOUR = 5 // 5時から開始（generateTimeSlotsと統一）
      const START_MINUTES = START_HOUR * 60 // 300分

      const startHour = convertTimestampToHour(schedule.start_time_unix || 0)
      const endHour = convertTimestampToHour(schedule.end_time_unix || 0)

      const startMinutes = hourToMinutes(startHour)
      const endMinutes = hourToMinutes(endHour)

      // 5時を起点として調整（5時 = 0列目）
      const adjustedStartMinutes = (startMinutes - START_MINUTES + TOTAL_MINUTES_PER_DAY) % TOTAL_MINUTES_PER_DAY
      const adjustedEndMinutes = (endMinutes - START_MINUTES + TOTAL_MINUTES_PER_DAY) % TOTAL_MINUTES_PER_DAY

      const startColumn = Math.floor(adjustedStartMinutes / TIME_SLOT_MINUTES)
      const endColumn = Math.ceil(adjustedEndMinutes / TIME_SLOT_MINUTES)
      const spanColumns = endColumn - startColumn

      const colorSet = SCHEDULE_COLORS
      scheduleBars.push({
        schedule: {
          type: "holiday",
          is_all_day: schedule.is_all_day,
          start_time_unix: schedule.start_time_unix || 0,
          end_time_unix: schedule.end_time_unix || 0,
        } as StaffSchedule,
        startColumn: startColumn,
        spanColumns: spanColumns,
        color: colorSet.holiday,
        source: schedule.scheduled_by,
        type: "holiday",
      })
    }
  })
  return scheduleBars
}

// ■ メインフック
/**
 * スタッフスケジュール表示用のタイムラインデータを取得・整形するメインフック
 * @param tenantId - テナントID
 * @param orgId - 組織ID
 * @param date - 対象日付（YYYY-MM-DD形式）
 * @param ready - データ取得の準備が完了しているかどうか
 * @returns スタッフ別のタイムラインデータ、タイムスロット、統計情報
 */
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

  // 組織の例外スケジュール（店舗休業・特別営業時間など）を取得
  const allSchedules = useQuery(
    api.staff.exception_schedule.query.allSchedulesByDate,
    ready && tenantId && orgId 
      ? { 
          tenant_id: tenantId, 
          org_id: orgId, 
          staff_ids: staffList.results.map(staff => staff._id),
          date,
        } 
      : 'skip',
  )

  // 時間スロットの生成（メモ化）
  const timeSlots = useMemo(() => generateTimeSlots(), [])

  // スタッフ別のタイムラインデータの計算（メモ化）
  const staffTimelineData = useMemo(() => {
    if (!staffList?.results || !reservations?.results || !allSchedules) return []

    const activeStaffs = staffList.results.filter(
      staff => staff.is_active && !staff.is_archive
    )
    const confirmedReservations = reservations.results.filter(
      res => res.status === 'confirmed' && !res.is_archive
    ) as ReservationWithDetails[]

    // 予約をスタッフIDでグループ化
    const reservationsByStaff = confirmedReservations.reduce((acc, reservation) => {
      const staffId = reservation.is_free_nomination 
        ? reservation.assigned_staff_id || reservation.staff_id 
        : reservation.staff_id
      
      if (staffId) {
        if (!acc[staffId]) acc[staffId] = []
        acc[staffId].push(reservation)
      }
      return acc
    }, {} as Record<string, ReservationWithDetails[]>)

    // スケジュールをスタッフIDでグループ化
    const schedulesByStaff = allSchedules.reduce((acc, schedule) => {
      if (schedule.staff_id) {
        if (!acc[schedule.staff_id]) acc[schedule.staff_id] = []
        acc[schedule.staff_id].push(schedule)
      }
      return acc
    }, {} as Record<string, TimelineSchedule[]>)

    // 組織全体のスケジュール
    const organizationSchedules = allSchedules.filter(
      schedule => schedule.scheduled_by === 'organization'
    )

    // スタッフごとのタイムラインデータを構築
    return activeStaffs.map(staff => {
      const staffSchedules = schedulesByStaff[staff._id] || []
      return {
        staff,
        reservations: reservationsByStaff[staff._id] || [],
        schedules: [...staffSchedules, ...organizationSchedules], // 個人のスケジュールと組織のスケジュールを結合
      }
    })
  }, [staffList?.results, reservations?.results, allSchedules])

  // 統計情報の計算（メモ化）
  const totalReservations = useMemo(() => 
    reservations?.results?.filter(res => res.status === 'confirmed' && !res.is_archive).length || 0,
    [reservations?.results]
  )

  // ローディング状態の判定
  const isLoading = useMemo(() => 
    !staffList || !reservations || allSchedules === undefined || 
    staffList.isLoading || reservations.isLoading,
    [staffList, reservations, allSchedules]
  )

  return {
    staffTimelineData,
    timeSlots,
    totalReservations,
    isLoading,
    schedules: allSchedules as TimelineSchedule[],
  }
}

// ■ 予約バー計算用フック
/**
 * 予約配列からタイムライン表示用のバー情報を生成する
 * @param reservations - 予約情報の配列
 * @returns タイムライン表示用の予約バー配列
 */
export function useReservationBars(reservations: ReservationWithDetails[]): ReservationBar[] {
  return useMemo(() => 
    reservations.map(calculateReservationBar),
    [reservations]
  )
}


// ■ スケジュールバー計算用フック
/**
 * スケジュール配列からタイムライン表示用のバー情報を生成する
 * @param schedules - スケジュール情報の配列
 * @returns タイムライン表示用の予約バー配列
 */
export function useScheduleBars(schedules: TimelineSchedule[]): ScheduleBar[] {
  return useMemo(() => 
    calculateScheduleBar(schedules),
    [schedules]
  )
}

// ■ エクスポート用の型と定数
export type {
  StaffTimelineData,
  ReservationWithDetails,
  StaffSchedule,
  OrganizationSchedule,
  TimeSlot,
  ReservationBar,
  ScheduleBar
}

export {
  TIME_SLOT_MINUTES,
  RESERVATION_COLORS,
  FREE_NOMINATION_COLORS,
  SCHEDULE_COLORS,
  ORGANIZATION_SCHEDULE_COLORS,
  calculateReservationBar,
  calculateScheduleBar
} 