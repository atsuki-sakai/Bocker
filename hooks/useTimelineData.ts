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

const FREE_NOMINATION_COLORS = {
  confirmed: 'bg-purple-100 border-purple-300 text-purple-800',
  pending: 'bg-orange-100 border-orange-300 text-orange-800',
  cancelled: 'bg-red-100 border-red-300 text-red-800',
  completed: 'bg-emerald-100 border-emerald-300 text-emerald-800',
} as const

const SCHEDULE_COLORS = {
  break: 'bg-gray-100 border-gray-300 text-gray-800',
  holiday: 'bg-red-50 border-red-200 text-red-700',
  work: 'bg-green-50 border-green-200 text-green-700',
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
 * @returns タイムライン表示用のバー情報
 */
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

  // 時間スロットの生成（メモ化）
  const timeSlots = useMemo(() => generateTimeSlots(), [])

  // スタッフ別のタイムラインデータの計算（メモ化）
  const staffTimelineData = useMemo(() => {
    if (!staffList?.results || !reservations?.results) return []
    
    console.log('[useTimelineData] データ確認:', {
      staffCount: staffList.results.length,
      reservationCount: reservations.results.length,
      freeNominationCount: reservations.results.filter(r => r.is_free_nomination).length,
      sampleReservations: reservations.results.slice(0, 3).map(r => ({
        id: r._id,
        is_free_nomination: r.is_free_nomination,
        staff_id: r.staff_id,
        assigned_staff_id: r.assigned_staff_id,
        status: r.status
      }))
    })
    
    // アクティブなスタッフのみフィルタリング
    const activeStaffs = staffList.results.filter(
      staff => staff.is_active && !staff.is_archive
    )

    // 予約受付済み予約のみフィルタリング
    const confirmedReservations = reservations.results.filter(
      res => res.status === 'confirmed' && !res.is_archive
    ) as ReservationWithDetails[]
    
    console.log('[useTimelineData] フィルタ後:', {
      activeStaffCount: activeStaffs.length,
      confirmedReservationCount: confirmedReservations.length,
      confirmedFreeNominationCount: confirmedReservations.filter(r => r.is_free_nomination).length
    })

    // スタッフIDでグループ化（パフォーマンス最適化）
    // フリー指名の場合はassigned_staff_idを使用、未割り当ての場合は通常のstaff_idを使用
    const reservationsByStaff = confirmedReservations.reduce((acc, reservation) => {
      let staffId: string | null = null
      
      if (reservation.is_free_nomination) {
        // フリー指名の場合: assigned_staff_idがあればそれを使用、なければstaff_idを使用
        staffId = reservation.assigned_staff_id || reservation.staff_id
      } else {
        // 通常の指名予約の場合
        staffId = reservation.staff_id
      }
      
      if (staffId && !acc[staffId]) {
        acc[staffId] = []
      }
      if (staffId) {
        acc[staffId].push(reservation)
      }
      return acc
    }, {} as Record<string, ReservationWithDetails[]>)

    console.log('[useTimelineData] スタッフ別グループ化結果:', {
      reservationsByStaffKeys: Object.keys(reservationsByStaff),
      reservationsByStaffValues: Object.entries(reservationsByStaff).map(([staffId, reservations]) => ({
        staffId,
        count: reservations.length,
        freeNominationCount: reservations.filter(r => r.is_free_nomination).length
      }))
    })

    // スタッフごとのタイムラインデータを構築
    // スケジュールは後で個別に取得するため、ここでは空配列
    const result = activeStaffs.map(staff => ({
      staff,
      reservations: reservationsByStaff[staff._id]|| [],
      schedules: [], // 個別取得するため空配列
    }))
    
    console.log('[useTimelineData] 最終結果:', {
      totalStaffs: result.length,
      totalReservations: result.reduce((sum, staff) => sum + staff.reservations.length, 0),
      staffWithReservations: result.filter(staff => staff.reservations.length > 0).length
    })
    
    return result
  }, [staffList?.results, reservations?.results])

  // 統計情報の計算（メモ化）
  const totalReservations = useMemo(() => 
    reservations?.results?.filter(res => res.status === 'confirmed' && !res.is_archive).length || 0,
    [reservations?.results]
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
    isLoading,
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
 * @returns タイムライン表示用のスケジュールバー配列
 */
export function useScheduleBars(schedules: StaffSchedule[]): ScheduleBar[] {
  return useMemo(() => 
    schedules.map(calculateScheduleBar),
    [schedules]
  )
}

// ■ 個別スタッフのスケジュール取得フック
/**
 * 特定のスタッフの特定日のスケジュールを取得する
 * @param tenantId - テナントID
 * @param orgId - 組織ID
 * @param staffId - スタッフID
 * @param date - 対象日付（YYYY-MM-DD形式）
 * @param ready - データ取得の準備が完了しているかどうか
 * @returns スタッフのスケジュール配列
 */
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
  FREE_NOMINATION_COLORS,
  SCHEDULE_COLORS,
  calculateReservationBar,
  calculateScheduleBar
} 