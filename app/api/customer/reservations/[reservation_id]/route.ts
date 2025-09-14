import { NextRequest, NextResponse } from 'next/server'
import { getCustomerSession } from '@/lib/auth/customer'
import { getSupabaseAdminService } from '@/services/supabase/SupabaseService'
import { ReservationRepository } from '@/services/supabase/repositories/reservation/ReservationRepository'

export async function GET(
  _req: NextRequest,
  { params }: { params: { reservation_id: string } }
) {
  try {
    const session = await getCustomerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { reservation_id } = params
    if (!reservation_id) {
      return NextResponse.json({ error: 'reservation_id is required' }, { status: 400 })
    }

    // Supabase (Admin) 経由で予約 + 予約詳細を取得
    const repo = new ReservationRepository(getSupabaseAdminService())
    const result = await repo.findById(reservation_id)

    if (!result || !result.reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    // アクセス制御: ログイン中の顧客自身の予約のみ
    if (result.reservation.customer_uid !== session.customerUid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ reservation: result.reservation, detail: result.reservationDetail })
  } catch (error) {
    console.error('[API GET /api/customer/reservations/[reservation_id]] Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

