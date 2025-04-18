import { DashboardSection } from '@/components/common';
import ReservationForm from './ReservationForm';

export default function ReservationAddPage() {
  return (
    <DashboardSection title="予約の作成" backLink="/dashboard/reservation" backLinkTitle="予約管理">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-500">予約の作成を行うことができます。</p>
      </div>
      <ReservationForm />
    </DashboardSection>
  );
}
