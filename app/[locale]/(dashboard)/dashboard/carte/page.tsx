import { DashboardSection } from '@/components/common'
import CustomerSearchForm from './CustomerSearchForm'

export default function CartePage() {
  return (
    <DashboardSection
      title="顧客カルテ管理"
      backLink="/dashboard"
      backLinkTitle="ダッシュボードへ戻る"
    >
      <CustomerSearchForm />
    </DashboardSection>
  )
}
