'use client';

import PointTabs from './PointTabs';
import { DashboardSection, withOwnerAccess } from '@/components/common';
import { useTranslations } from 'next-intl';

function PointPage() {
  const t = useTranslations('point');
  const dashboardT = useTranslations('dashboard');
  
  return (
    <DashboardSection
      title={t('title')}
      backLink="/dashboard"
      backLinkTitle={dashboardT('title')}
    >
      <PointTabs />
    </DashboardSection>
  );
}

export default withOwnerAccess(PointPage);
