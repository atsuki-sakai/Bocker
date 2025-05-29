import MenuListContent from './menuList';
import { DashboardSection } from '@/components/common';

export default function MenuPage() {
  return (
    <DashboardSection
      title="メニュー設定"
      backLink="/dashboard"
      backLinkTitle="ダッシュボードに戻る"
      infoBtn={{
        text: '新規メニューを作成',
        link: '/dashboard/menu/add',
      }}
    >
      <MenuListContent />
    </DashboardSection>
  );
}
