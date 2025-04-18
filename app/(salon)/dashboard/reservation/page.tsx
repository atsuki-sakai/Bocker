import ReservationList from './ReservationList';

import { DashboardSection } from '@/components/common';

export default function ReservationPage() {
  return (
    <DashboardSection
      title="予約管理"
      backLink="/dashboard"
      backLinkTitle="ダッシュボード"
      infoBtn={{ text: '予約の作成', link: '/dashboard/reservation/add' }}
    >
      <p className="text-sm text-gray-500">予約の確認・作成・編集・削除を行うことができます。</p>
      <ReservationList />
    </DashboardSection>
  );
}
