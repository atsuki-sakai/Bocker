import { DashboardSection } from '@/components/common'

type CartePageProps = {
  params: Promise<{
    customer_id: string
  }>
}

export default async function CartePage({ params }: CartePageProps) {
  const { customer_id } = await params

  // FIXME: ここで顧客の今までの予約を最新のものから10件ずつページネーションで取得する。
  return (
    <DashboardSection title="Carte" backLink="/dashboard" backLinkTitle="back">
      <p>Carte: {customer_id}</p>
    </DashboardSection>
  )
}
