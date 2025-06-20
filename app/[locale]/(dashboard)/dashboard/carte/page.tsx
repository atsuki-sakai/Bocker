'use client'

import { useTranslations } from 'next-intl'
import { DashboardSection } from '@/components/common'
import CustomerSearchForm from './CustomerSearchForm'

export default function CartePage() {
  const tCarte = useTranslations('dashboard.carte')
  
  return (
    <DashboardSection
      title={tCarte('title')}
      backLink="/dashboard"
      backLinkTitle={tCarte('backToDashboard')}
    >
      <CustomerSearchForm />
    </DashboardSection>
  )
}
