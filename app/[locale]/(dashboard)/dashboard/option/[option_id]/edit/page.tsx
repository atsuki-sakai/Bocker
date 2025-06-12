'use client';

import OptionEditForm from './OptionEditForm';
import { DashboardSection, withManagerAccess } from '@/components/common';
import { useTranslations } from 'next-intl';

function OptionEditPage() {
  const t = useTranslations('options');
  
  return (
    <DashboardSection
      title={t('edit.title')}
      backLink="/dashboard/option"
      backLinkTitle={t('list.title')}
    >
      <OptionEditForm />
    </DashboardSection>
  );
}

export default withManagerAccess(OptionEditPage);
