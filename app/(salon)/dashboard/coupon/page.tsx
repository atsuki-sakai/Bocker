import { DashboardSection } from '@/components/common';
import CouponForm from './CouponForm';

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
