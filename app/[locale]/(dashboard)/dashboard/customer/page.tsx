'use client';

import { DashboardSection, withManagerAccess } from '@/components/common'
import CustomerList from './CustomerList'

function CustomerPage() {
  return (
    <DashboardSection
      title="顧客一覧"
      backLink="/dashboard"
      backLinkTitle="ダッシュボードに戻る"
      infoBtn={{
        text: '顧客を追加',
        link: '/dashboard/customer/add',
      }}
    >
      <CustomerList />
    </DashboardSection>
  )
}

export default withManagerAccess(CustomerPage);
