import { DashboardSection } from '@/components/common';
import CustomerList from './CustomerList';
export default function CustomerPage() {
  return (
    <DashboardSection
      title="顧客一覧"
      backLink="/dashboard"
      backLinkTitle="ダッシュボードに戻る"
      infoBtn={{
        text: '顧客を追加',
        link: '/dashboard/customer/add',
      }}
    >
      <CustomerList />
    </DashboardSection>
  );
}
