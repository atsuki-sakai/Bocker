import MenuAddForm from './MenuAddForm';
import { DashboardSection } from '@/components/common';

export default function MenuAddPage() {
  return (
    <DashboardSection
      title="新規メニュー作成"
      backLink="/dashboard/menu"
      backLinkTitle="メニュー設定に戻る"
    >
      <MenuAddForm />
    </DashboardSection>
  );
}
