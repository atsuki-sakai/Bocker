'use client';

import { DashboardSection } from '@/components/common';
import { withOwnerAccess } from '@/components/common';
import { useTranslations } from 'next-intl';
import StaffList from './StaffList';

function StaffPage() {
  const t = useTranslations();

  return (
    <DashboardSection
      title={t('staff.list.title')}
      backLink="/dashboard"
      backLinkTitle={t('navigation.dashboard')}
      infoBtn={{
        text: t('staff.addStaff'),
        link: '/dashboard/staff/add',
      }}
      subBtn={{
        text: t('staff.workScheduleManagement'),
        link: '/dashboard/staff/schedule',
      }}
    >
      <StaffList />
    </DashboardSection>
  );
}

export default withOwnerAccess(StaffPage);
