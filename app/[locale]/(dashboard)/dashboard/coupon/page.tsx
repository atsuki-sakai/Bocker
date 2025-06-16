'use client';

import { DashboardSection, withManagerAccess } from '@/components/common';
import CouponList from './CouponList';
import { useTranslations } from 'next-intl'

function CouponPage() {
  const t = useTranslations('coupon')
  const tCommon = useTranslations('common')

  return (
    <DashboardSection
      title={t('list')}
      backLink="/dashboard"
      backLinkTitle={tCommon('backToDashboard')}
      infoBtn={{
        text: t('addCoupon'),
        link: '/dashboard/coupon/add',
      }}
    >
      <CouponList />
    </DashboardSection>
  )
}

export default withManagerAccess(CouponPage);
