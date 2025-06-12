'use client';

import { DashboardSection, withManagerAccess } from '@/components/common';
import CustomerAddForm from './CustomerAddForm';
import { useTranslations } from 'next-intl';

function CustomerAddPage() {
  const t = useTranslations('customers');
  
  return (
    <DashboardSection
      title={t('addCustomer')}
      backLink="/dashboard/customer"
      backLinkTitle={t('list')}
    >
      <CustomerAddForm />
    </DashboardSection>
  );
}

export default withManagerAccess(CustomerAddPage);
