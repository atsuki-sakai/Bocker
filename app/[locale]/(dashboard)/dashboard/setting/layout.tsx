'use client'

import { DashboardSection } from '@/components/common'
import { useTranslations } from 'next-intl'

export default function SettingLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('common')
  const tSettings = useTranslations('settings')

  return (
    <DashboardSection
      title={tSettings('title')}
      backLink="/dashboard"
      backLinkTitle={t('backToDashboard')}
    >
      {children}
    </DashboardSection>
  )
}
