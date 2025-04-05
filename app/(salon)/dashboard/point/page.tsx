import PointTabs from './PointTabs';
import { DashboardSection } from '@/components/common';

export default function PointPage() {
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
