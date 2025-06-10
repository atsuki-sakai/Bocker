'use client';

import MenuListContent from './menuList';
import { DashboardSection, withManagerAccess } from '@/components/common';

function MenuPage() {
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

export default withManagerAccess(MenuPage);
