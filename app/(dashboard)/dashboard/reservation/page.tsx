import ReservationList from './ReservationList';

import { DashboardSection } from '@/components/common';

export default function ReservationPage() {
  return (
    <DashboardSection title="予約ボード" backLink="/dashboard" backLinkTitle="ダッシュボード">
      <p className="text-sm text-gray-500">
        有効な予約を確認したり、施術完了時にステータスなどを変更します。
      </p>
      <ReservationList />
    </DashboardSection>
  )
}
