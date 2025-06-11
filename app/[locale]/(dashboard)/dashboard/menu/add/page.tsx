'use client';

import MenuAddForm from './MenuAddForm';
import { DashboardSection, withManagerAccess } from '@/components/common';

function MenuAddPage() {
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

export default withManagerAccess(MenuAddPage);
