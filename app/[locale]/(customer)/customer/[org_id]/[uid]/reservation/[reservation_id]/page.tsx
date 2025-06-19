import { getCustomerWithDetails, getCustomerSession } from '@/lib/auth/customer'
import { redirect } from 'next/navigation'
import { ReservationDetailPageClient } from './ReservationDetailPageClient'

interface ReservationDetailPageProps {
  params: Promise<{
    org_id: string
    uid: string
    reservation_id: string
  }>
}

export default async function ReservationDetailPage({ params }: ReservationDetailPageProps) {
  const { org_id, uid, reservation_id } = await params

  // セッション認証チェック（サーバーサイド）
  const session = await getCustomerSession()
  if (!session) {
    redirect(`/customer/${org_id}/auth/login`)
  }

  // 顧客情報の検証とアクセス権限チェック
  let customerData
  try {
    customerData = await getCustomerWithDetails(uid, session.orgId, session.tenantId)
  } catch (error) {
    console.error('[ReservationDetailPage] Failed to get customer details:', error)
    redirect(`/customer/${org_id}/auth/login`)
  }

  const { customer } = customerData

  // 顧客情報が取得できない場合はログイン画面へ
  if (!customer) {
    redirect(`/customer/${org_id}/auth/login`)
  }

  // 認証が完了したら、クライアントコンポーネントに必要な情報を渡す
  return (
    <ReservationDetailPageClient 
      orgId={org_id}
      customerUid={uid}
      reservationId={reservation_id}
      tenantId={session.tenantId}
      sessionOrgId={session.orgId}
    />
  )
}