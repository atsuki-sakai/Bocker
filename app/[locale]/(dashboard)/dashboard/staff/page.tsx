'use client';

import { DashboardSection } from '@/components/common';
import { withOwnerAccess } from '@/components/common';
import { useTranslations } from 'next-intl';
import StaffList from './StaffList';

function StaffPage() {
  const t = useTranslations('staff')
  const tCommon = useTranslations('common')

  return (
    <DashboardSection
      title={t('title')}
      backLink="/dashboard"
      backLinkTitle={tCommon('backToDashboard')}
      infoBtn={{
        text: t('addStaff'),
        link: '/dashboard/staff/add',
      }}
      subBtn={{
        text: t('workScheduleManagement'),
        link: '/dashboard/staff/schedule',
      }}
    >
      <StaffList />
    </DashboardSection>
  )
}

export default withOwnerAccess(StaffPage);
