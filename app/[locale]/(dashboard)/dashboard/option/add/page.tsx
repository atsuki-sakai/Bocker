'use client';

import OptionAddForm from './OptionAddForm';
import { DashboardSection, withManagerAccess } from '@/components/common';
import { useTranslations } from 'next-intl';

function OptionAddPage() {
  const t = useTranslations('options');
  
  return (
    <DashboardSection
      title={t('add.title')}
      backLink="/dashboard/option"
      backLinkTitle={t('list.title')}
    >
      <OptionAddForm />
    </DashboardSection>
  );
}

export default withManagerAccess(OptionAddPage);
