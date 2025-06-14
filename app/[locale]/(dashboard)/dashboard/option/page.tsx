'use client';

import OptionList from './OptionList';
import { DashboardSection, withManagerAccess } from '@/components/common';
import { useTranslations } from 'next-intl';

function OptionPage() {
  const t = useTranslations('options');
  const tCommon = useTranslations('common')
  
  return (
    <DashboardSection
      title={t('list.title')}
      backLink="/dashboard"
      backLinkTitle={tCommon('backToDashboard')}
      infoBtn={{ text: t('list.addNew'), link: '/dashboard/option/add' }}
    >
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">{t('list.description')}</p>
      </div>
      <OptionList />
    </DashboardSection>
  )
}

export default withManagerAccess(OptionPage);
