'use client';

import OptionAddForm from './OptionAddForm';
import { DashboardSection, withManagerAccess } from '@/components/common';

function OptionAddPage() {
  return (
    <DashboardSection
      title="オプションを作成"
      backLink="/dashboard/option"
      backLinkTitle="オプション一覧"
    >
      <OptionAddForm />
    </DashboardSection>
  );
}

export default withManagerAccess(OptionAddPage);
