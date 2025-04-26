'use client';

import { DashboardSection } from '@/components/common';

export default function SettingLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardSection title="設定" backLink="/dashboard" backLinkTitle="ダッシュボードに戻る">
      {children}
    </DashboardSection>
  );
}
