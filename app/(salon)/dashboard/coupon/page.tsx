import { DashboardSection } from '@/components/common';
import CouponForm from './CouponForm';
import { preloadQuery, preloadedQueryResult } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';
import { serverConvexAuth } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

export default async function CouponPage() {
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
      <CouponForm />
    </DashboardSection>
  );
}
