'use client';

import OptionEditForm from './OptionEditForm';
import { DashboardSection, withManagerAccess } from '@/components/common';

function OptionEditPage() {
  return (
    <DashboardSection
      title="オプション編集"
      backLink="/dashboard/option"
      backLinkTitle="オプション一覧"
    >
      <OptionEditForm />
    </DashboardSection>
  );
}

export default withManagerAccess(OptionEditPage);
