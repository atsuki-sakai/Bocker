import { DashboardSection } from '@/components/common';
import CustomerAddForm from './CustomerAddForm';

export default function CustomerAddPage() {
  return (
    <DashboardSection
      title="顧客を追加"
      backLink="/dashboard/customer"
      backLinkTitle="顧客一覧に戻る"
    >
      <CustomerAddForm />
    </DashboardSection>
  );
}
