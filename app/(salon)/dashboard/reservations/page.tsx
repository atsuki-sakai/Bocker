'use client'

import { supabaseService } from '@/services/supabase/SupabaseService'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ReservationDateFilter } from './_components/ReservationDateFilter'
import { convertReservationStatus, ReservationStatus } from '@/services/convex/shared/types/common'
import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Tables } from '@/supabase.types'
/**
 * 日時フォーマッタ:
 * - 10桁 UNIX → 秒, 13桁 → ミリ秒
 * - ISO 文字列も受け付ける
 */
function formatDate(v: string | number | null) {
  if (v === null || v === undefined) return '--'
  const n = Number(v)
  const date = !Number.isNaN(n) && n !== 0 ? new Date(n < 1e11 ? n * 1000 : n) : new Date(String(v))
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type SupabaseReservation = Tables<'reservation'>

export default function ReservationsPage() {
  /* --- Query params --- */
  const searchParams = useSearchParams()
  const page = Math.max(Number(searchParams?.get('page') ?? '1'), 1)
  const pageSize = 50

  const [from, setFrom] = useState<Date | undefined>(() => {
    const fromParam = searchParams?.get('from')
    return fromParam ? new Date(fromParam) : undefined
  })

  const [to, setTo] = useState<Date | undefined>(() => {
    const toParam = searchParams?.get('to')
    if (toParam) {
      const date = new Date(toParam)
      // Check if the time is 00:00:00 (UTC), indicating it was likely set as just a date string YYYY-MM-DD
      // Note: new Date('YYYY-MM-DD') parses as UTC midnight.
      // We adjust it to the local timezone's end of day.
      if (
        date.getUTCHours() === 0 &&
        date.getUTCMinutes() === 0 &&
        date.getUTCSeconds() === 0 &&
        date.getUTCMilliseconds() === 0
      ) {
        // Create a new date object to avoid mutating the one derived from searchParams directly if it's used elsewhere
        const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
        localDate.setHours(23, 59, 59, 999) // Set to end of local day
        return localDate
      }
      return date
    }
    return undefined
  })
  const [staffId, setStaffId] = useState<string | undefined>(
    searchParams?.get('staffId') ?? undefined
  )
  const [customerId, setCustomerId] = useState<string | undefined>(
    searchParams?.get('customerId') ?? undefined
  )

  useEffect(() => {
    const fromParam = searchParams?.get('from')
    setFrom(fromParam ? new Date(fromParam) : undefined)

    const toParam = searchParams?.get('to')
    if (toParam) {
      const date = new Date(toParam)
      if (
        date.getUTCHours() === 0 &&
        date.getUTCMinutes() === 0 &&
        date.getUTCSeconds() === 0 &&
        date.getUTCMilliseconds() === 0
      ) {
        const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
        localDate.setHours(23, 59, 59, 999)
        setTo(localDate)
      } else {
        setTo(date)
      }
    } else {
      setTo(undefined)
    }

    setStaffId(searchParams?.get('staffId') ?? undefined)
    setCustomerId(searchParams?.get('customerId') ?? undefined)
  }, [searchParams])

  const [reservations, setReservations] = useState<SupabaseReservation[]>([])
  const [count, setCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReservations = async () => {
      setLoading(true)
      const { data, count: totalCount } = await supabaseService.listRecords('reservation', {
        rangeFilter: {
          column: 'start_time_unix',
          from: from ? from.toISOString() : undefined,
          to: to ? to.toISOString() : undefined,
        },
        filters: {
          staff_id: staffId,
          customer_id: customerId,
        },
        page,
        pageSize,
        select: [
          'customer_name',
          'staff_name',
          'start_time_unix',
          'status',
          'total_price',
          '_id',
        ] as const,
      })
      setReservations(data)
      setCount(totalCount)
      setLoading(false)
    }

    // Check if 'from' is after 'to'. If so, don't fetch and clear results.
    if (from && to && from > to) {
      setReservations([])
      setCount(0)
      setLoading(false)
    } else {
      fetchReservations()
    }
  }, [from, to, staffId, customerId, page, pageSize])

  /* --- UI --- */
  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <h1 className="text-2xl font-semibold">
        予約一覧
        <span className="ml-2 text-sm font-normal">({count ?? 0})</span>
      </h1>

      <ReservationDateFilter />

      <div className="hidden sm:block w-full overflow-x-auto">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead>顧客</TableHead>
              <TableHead className="hidden sm:table-cell">担当</TableHead>
              <TableHead>開始時間</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead className="hidden sm:table-cell text-right">合計金額</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {reservations.length ? (
              reservations.map((r) => (
                <TableRow key={r._id}>
                  <TableCell>{r.customer_name ?? '--'}</TableCell>
                  <TableCell className="hidden sm:table-cell">{r.staff_name ?? '--'}</TableCell>
                  <TableCell>{formatDate(r.start_time_unix)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {convertReservationStatus(r.status as ReservationStatus)}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-right">
                    {r.total_price ? `¥${r.total_price.toLocaleString()}` : '--'}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 bg-muted text-muted-foreground">
                  一致する予約はありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile list view */}
      <div className="sm:hidden">
        {reservations.length ? (
          <ul className="flex flex-col gap-2">
            {reservations.map((r) => (
              <li key={r._id} className="rounded-md border p-4 shadow-sm bg-white dark:bg-muted">
                <div className="flex justify-between items-start">
                  <span className="font-medium">{r.customer_name ?? '--'}</span>
                  <Badge variant="outline" className="shrink-0">
                    {r.status ?? '---'}
                  </Badge>
                </div>

                <div className="mt-1 text-sm text-muted-foreground">
                  {formatDate(r.start_time_unix)}
                </div>

                <div className="mt-2 flex justify-between text-sm">
                  <span>担当: {r.staff_name ?? '--'}</span>
                  <span>{r.total_price ? `¥${r.total_price.toLocaleString()}` : '--'}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex justify-center items-center h-full bg-muted py-12 rounded-md shadow-sm border border-muted-foreground">
            <p className="text-center text-muted-foreground text-sm">一致する予約はありません</p>
          </div>
        )}
      </div>
    </div>
  )
}
