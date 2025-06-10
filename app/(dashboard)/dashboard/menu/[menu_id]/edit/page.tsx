'use client';

import MenuEditForm from './MenuEditForm';
import { DashboardSection, withManagerAccess } from '@/components/common';

function MenuEditPage() {
  return (
    <DashboardSection title="メニュー編集" backLink="/dashboard/menu" backLinkTitle="メニュー一覧">
      <MenuEditForm />
    </DashboardSection>
  );
}

export default withManagerAccess(MenuEditPage);
