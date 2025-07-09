import CustomerCarteEditForm from './CustomerCarteEditForm'
import { DashboardSection } from '@/components/common'

export default function CustomerCarteEditPage() {
  return (
    <DashboardSection
      title="顧客カルテ編集"
      backLink="/dashboard/carte"
      backLinkTitle="顧客カルテ一覧"
    >
      <CustomerCarteEditForm />
    </DashboardSection>
  )
}
