import StaffDetails from './StaffDetails';
import { DashboardSection } from '@/components/common';

export default function StaffDetailsPage() {
  return (
    <DashboardSection title="スタッフ詳細" backLink="/dashboard/staff" backLinkTitle="スタッフ一覧">
      <StaffDetails />
    </DashboardSection>
  );
}
