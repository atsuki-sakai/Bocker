import MenuEditForm from './MenuEditForm';
import { DashboardSection } from '@/components/common';

export default function MenuPage() {
  return (
    <DashboardSection title="メニュー編集" backLink="/dashboard/menu" backLinkTitle="メニュー一覧">
      <MenuEditForm />
    </DashboardSection>
  );
}
