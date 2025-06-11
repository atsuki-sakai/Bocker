'use client';

import { DashboardSection, withManagerAccess } from '@/components/common';
import CustomerAddForm from './CustomerAddForm';

function CustomerAddPage() {
  return (
    <DashboardSection
      title="顧客を追加"
      backLink="/dashboard/customer"
      backLinkTitle="顧客一覧に戻る"
    >
      <CustomerAddForm />
    </DashboardSection>
  );
}

export default withManagerAccess(CustomerAddPage);
