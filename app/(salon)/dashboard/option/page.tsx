import OptionList from './OptionList';
import { DashboardSection } from '@/components/common';

export default function OptionPage() {
  return (
    <DashboardSection
      title="オプション一覧"
      backLink="/dashboard"
      backLinkTitle="ダッシュボード"
      infoBtn={{ text: 'オプションを作成', link: '/dashboard/option/add' }}
    >
      <OptionList />
    </DashboardSection>
  );
}
