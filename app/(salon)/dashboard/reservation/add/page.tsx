import { DashboardSection } from '@/components/common';
import ReservationForm from './ReservationForm';

export default function ReservationAddPage() {
  return (
    <DashboardSection title="予約の作成" backLink="/dashboard/reservation" backLinkTitle="予約管理">
      <ReservationForm />
    </DashboardSection>
  )
}
