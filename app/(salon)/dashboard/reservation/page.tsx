import ReservationList from './ReservationList';

import { DashboardSection } from '@/components/common';

export default function ReservationPage() {
  return (
    <DashboardSection title="予約管理" backLink="/dashboard" backLinkTitle="ダッシュボード">
      <p className="text-sm text-gray-500">
        ステータス毎の予約の確認・編集・削除を行うことができます。
      </p>
      <ReservationList />
    </DashboardSection>
  )
}
