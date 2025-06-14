'use client'
import StaffEditForm from './StaffEditForm'
import { DashboardSection } from '@/components/common'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import { useTranslations } from 'next-intl'

export default function StaffEditPage() {
  const { role } = useTenantAndOrganization()
  const t = useTranslations('staff')
  
  return role === 'admin' ? (
    <DashboardSection title={t('edit.title')} backLink="/dashboard/staff" backLinkTitle={t('list.title')}>
      <StaffEditForm />
    </DashboardSection>
  ) : (
    <div className="pb-20">
      <h2 className="text-2xl font-bold text-primary mb-4">{t('edit.title')}</h2>
      <StaffEditForm />
    </div>
  )
}
