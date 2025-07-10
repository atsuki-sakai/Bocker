'use client';

import { DashboardSection, withManagerAccess } from '@/components/common';
import CustomerEditForm from './CustomerEditForm';
import { useTranslations } from 'next-intl';

function CustomerEditPage() {
  const t = useTranslations('customers');
  
  return (
    <DashboardSection
      title={t('editCustomer')}
      backLink="/dashboard/customer"
      backLinkTitle={t('list')}
    >
      <CustomerEditForm />
    </DashboardSection>
  );
}

export default withManagerAccess(CustomerEditPage);
