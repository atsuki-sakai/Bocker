'use client';
import { DashboardSection } from '@/components/common';
import { useParams } from 'next/navigation';
import { Id } from '@/convex/_generated/dataModel';

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = params.customer_id as Id<'customer'>;
  return (
    <DashboardSection
      title="顧客詳細"
      backLink="/dashboard/customer"
      backLinkTitle="顧客一覧に戻る"
    >
      <h1>CustomerDetailPage : {customerId}</h1>
    </DashboardSection>
  );
}
