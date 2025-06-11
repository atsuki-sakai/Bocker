'use client';

import MenuEditForm from './MenuEditForm';
import { DashboardSection, withManagerAccess } from '@/components/common';
import { useTranslations } from 'next-intl';

function MenuEditPage() {
  const t = useTranslations('menus');
  
  return (
    <DashboardSection title={t('edit.title')} backLink="/dashboard/menu" backLinkTitle={t('list.title')}>
      <MenuEditForm />
    </DashboardSection>
  );
}

export default withManagerAccess(MenuEditPage);
