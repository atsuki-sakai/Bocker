import StaffEditForm from './StaffEditForm';
import { DashboardSection } from '@/components/common';

export default function StaffEditPage() {
  return (
    <DashboardSection title="スタッフ編集" backLink="/dashboard/staff" backLinkTitle="スタッフ一覧">
      <StaffEditForm />
    </DashboardSection>
  );
}
