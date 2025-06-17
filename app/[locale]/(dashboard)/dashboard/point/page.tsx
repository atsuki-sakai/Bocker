'use client';

import PointForm from './PointForm'
import { DashboardSection, withOwnerAccess } from '@/components/common'
import { useTranslations } from 'next-intl'

function PointPage() {
  const t = useTranslations('point')
  const tCommon = useTranslations('common')

  return (
    <DashboardSection
      title={t('title')}
      backLink="/dashboard"
      backLinkTitle={tCommon('backToDashboard')}
    >
      <PointForm />
    </DashboardSection>
  )
}

export default withOwnerAccess(PointPage);
