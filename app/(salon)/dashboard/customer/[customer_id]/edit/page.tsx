import { DashboardSection } from '@/components/common';
import CustomerEditForm from './CustomerEditForm';

export default function CustomerEditPage({ params }: { params: { customer_id: string } }) {
  const { customer_id } = params;
  return (
    <DashboardSection
      title="顧客を編集"
      backLink="/dashboard/customer"
      backLinkTitle="顧客一覧に戻る"
    >
      <CustomerEditForm customerId={customer_id} />
    </DashboardSection>
  );
}
