'use client';

import { DashboardSection } from '@/components/common';
import { withOwnerAccess } from '@/components/common';
import StaffList from './StaffList';

function StaffPage() {
  return (
    <DashboardSection
      title="スタッフ一覧"
      backLink="/dashboard"
      backLinkTitle="ダッシュボード"
      infoBtn={{
        text: 'スタッフを追加',
        link: '/dashboard/staff/add',
      }}
      subBtn={{
        text: 'スタッフの勤務管理',
        link: '/dashboard/staff/schedule',
      }}
    >
      <StaffList />
    </DashboardSection>
  );
}

export default withOwnerAccess(StaffPage);
