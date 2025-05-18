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

type ReservationsPageProps = {
  searchParams?: {
    from?: string
    to?: string
    staffId?: string
    customerId?: string
    page?: string
  }
}

export default async function ReservationsPage({ searchParams }: ReservationsPageProps) {
  /* --- Query params --- */
  const page = Math.max(Number(searchParams?.page ?? '1'), 1)
  const pageSize = 50

  /* --- Supabase fetch --- */
  const { data: reservations, count } = await supabaseService.listRecords('reservation', {
    rangeFilter: {
      column: 'start_time_unix',
      from: searchParams?.from,
      to: searchParams?.to,
    },
    filters: {
      staff_id: searchParams?.staffId,
      customer_id: searchParams?.customerId,
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

  /* --- UI --- */
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
