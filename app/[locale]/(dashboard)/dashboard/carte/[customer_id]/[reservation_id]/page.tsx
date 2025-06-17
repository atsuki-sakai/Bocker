import { DashboardSection } from '@/components/common'
import { Link } from '@/i18n/navigation'

type ReservationPageProps = {
  params: Promise<{
    customer_id: string
    reservation_id: string
  }>
}

export default async function ReservationPage({ params }: ReservationPageProps) {
  const { customer_id, reservation_id } = await params

  // FIXME: ここで予約の詳細を取得する。

  return (
    <DashboardSection title="カルテ詳細" backLink="/dashboard" backLinkTitle="ダッシュボードへ戻る">
      <p>カルテ詳細</p>
      <div className="flex gap-4">
        <Link href={`/dashboard/carte/${customer_id}/${reservation_id}/photo/add`}>
          カルテ写真を追加
        </Link>
        <Link href={`/dashboard/carte/${customer_id}/${reservation_id}/photo/edit`}>
          カルテ写真を編集
        </Link>
      </div>
    </DashboardSection>
  )
}
