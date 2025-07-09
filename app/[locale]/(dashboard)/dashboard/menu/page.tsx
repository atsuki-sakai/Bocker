'use client';

import { MenuList } from './menuList'
import { DashboardSection, withManagerAccess } from '@/components/common'
import { useTranslations } from 'next-intl'

function MenuPage() {
  const t = useTranslations('menus.list')
  const tCommon = useTranslations('common')

  return (
    <DashboardSection
      title={t('title')}
      backLink="/dashboard"
      backLinkTitle={tCommon('backToDashboard')}
      infoBtn={{
        text: t('addNew'),
        link: '/dashboard/menu/add',
      }}
    >
      <MenuList />
    </DashboardSection>
  )
}

export default withManagerAccess(MenuPage);
