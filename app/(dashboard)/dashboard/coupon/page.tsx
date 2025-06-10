'use client';

import { DashboardSection, withManagerAccess } from '@/components/common';
import CouponList from './CouponList';

function CouponPage() {
  return (
    <DashboardSection
      title="クーポン一覧"
      backLink="/dashboard"
      backLinkTitle="ダッシュボードへ戻る"
      infoBtn={{
        text: 'クーポンを作成',
        link: '/dashboard/coupon/add',
      }}
    >
      <CouponList />
    </DashboardSection>
  );
}

export default withManagerAccess(CouponPage);
