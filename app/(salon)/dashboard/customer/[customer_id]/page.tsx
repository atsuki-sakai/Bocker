import { DashboardSection } from '@/components/common';

export default function CustomerDetailPage({ params }: { params: { customer_id: string } }) {
  const { customer_id } = params;
  return (
    <DashboardSection
      title="顧客詳細"
      backLink="/dashboard/customer"
      backLinkTitle="顧客一覧に戻る"
    >
      <h1>CustomerDetailPage : {customer_id}</h1>
    </DashboardSection>
  );
}
