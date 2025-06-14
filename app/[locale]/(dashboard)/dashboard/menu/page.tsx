'use client';

import MenuListContent from './menuList';
import { DashboardSection, withManagerAccess } from '@/components/common';
import { useTranslations } from 'next-intl'

function MenuPage() {
  const t = useTranslations('options')

  return (
    <DashboardSection
      title={t('menus.list.title')}
      backLink="/dashboard"
      backLinkTitle={t('menus.list.dashboard')}
      infoBtn={{
        text: t('menus.list.addNew'),
        link: '/dashboard/menu/add',
      }}
    >
      <MenuListContent />
    </DashboardSection>
  )
}

export default withManagerAccess(MenuPage);
