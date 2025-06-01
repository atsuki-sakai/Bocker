import { DashboardSection } from '@/components/common';
import CustomerEditForm from './CustomerEditForm';

export default async function CustomerEditPage() {
  return (
    <DashboardSection
      title="顧客を編集"
      backLink="/dashboard/customer"
      backLinkTitle="顧客一覧に戻る"
    >
      <CustomerEditForm />
    </DashboardSection>
  );
}
