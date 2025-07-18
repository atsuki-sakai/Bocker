'use client'

import { DashboardSection } from '@/components/common'
import CustomerList from './CustomerList'
import { useTranslations } from 'next-intl'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'

function CustomerPage() {
  const t = useTranslations('customers')
  const tCommon = useTranslations('common')
  const { role } = useTenantAndOrganization()

  return (
    <DashboardSection
      title={t('list')}
      backLink="/dashboard"
      backLinkTitle={tCommon('backToDashboard')}
      infoBtn={
        role === 'admin' || role === 'owner' || role === 'manager'
          ? {
              text: t('addCustomer'),
              link: '/dashboard/customer/add',
            }
          : undefined
      }
    >
      <CustomerList />
    </DashboardSection>
  )
}

export default CustomerPage
