import { getCustomerWithDetails, getCustomerSession } from '@/lib/auth/customer'
import { redirect } from 'next/navigation'
import { ReservationPageClient } from './ReservationPageClient'

interface ReservationPageProps {
  params: Promise<{
    org_id: string
    uid: string
  }>
}

export default async function ReservationPage({ params }: ReservationPageProps) {
  const { org_id, uid } = await params

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
    console.error('[ReservationPage] Failed to get customer details:', error)
    redirect(`/customer/${org_id}/auth/login`)
  }

  const { customer } = customerData

  // 顧客情報が取得できない場合はログイン画面へ
  if (!customer) {
    redirect(`/customer/${org_id}/auth/login`)
  }

  // 認証が完了したら、クライアントコンポーネントに必要な情報を渡す
  return (
    <ReservationPageClient 
      orgId={org_id}
      customerUid={uid}
      tenantId={session.tenantId}
      sessionOrgId={session.orgId}
    />
  )
}