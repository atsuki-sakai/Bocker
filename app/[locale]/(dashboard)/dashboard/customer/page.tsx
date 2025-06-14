'use client';

import { DashboardSection, withManagerAccess } from '@/components/common'
import CustomerList from './CustomerList'
import { useTranslations } from 'next-intl'

function CustomerPage() {
  const t = useTranslations('customers')
  const tCommon = useTranslations('common')
  
  return (
    <DashboardSection
      title={t('list')}
      backLink="/dashboard"
      backLinkTitle={tCommon('backToDashboard')}
      infoBtn={{
        text: t('addCustomer'),
        link: '/dashboard/customer/add',
      }}
    >
      <CustomerList />
    </DashboardSection>
  )
}

export default withManagerAccess(CustomerPage);
