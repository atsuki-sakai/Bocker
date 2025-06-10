'use client';

import PointTabs from './PointTabs';
import { DashboardSection, withOwnerAccess } from '@/components/common';

function PointPage() {
  return (
    <DashboardSection
      title="ポイント設定"
      backLink="/dashboard"
      backLinkTitle="ダッシュボードに戻る"
    >
      <PointTabs />
    </DashboardSection>
  );
}

export default withOwnerAccess(PointPage);
