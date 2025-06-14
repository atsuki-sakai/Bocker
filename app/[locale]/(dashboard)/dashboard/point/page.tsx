'use client';

import PointTabs from './PointTabs';
import { DashboardSection, withOwnerAccess } from '@/components/common';
import { useTranslations } from 'next-intl';

function PointPage() {
  const t = useTranslations('point');
  const tCommon = useTranslations('common')
  
  return (
    <DashboardSection
      title={t('title')}
      backLink="/dashboard"
      backLinkTitle={tCommon('backToDashboard')}
    >
      <PointTabs />
    </DashboardSection>
  )
}

export default withOwnerAccess(PointPage);
