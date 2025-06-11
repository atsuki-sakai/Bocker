'use client'
import StaffEditForm from './StaffEditForm'
import { DashboardSection } from '@/components/common'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'

export default function StaffEditPage() {
  const { role } = useTenantAndOrganization()
  return role === 'admin' ? (
    <DashboardSection title="スタッフ編集" backLink="/dashboard/staff" backLinkTitle="スタッフ一覧">
      <StaffEditForm />
    </DashboardSection>
  ) : (
    <div className="pb-20">
      <h2 className="text-2xl font-bold text-primary mb-4">スタッフ編集</h2>
      <StaffEditForm />
    </div>
  )
}
