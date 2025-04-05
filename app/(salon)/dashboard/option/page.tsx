import OptionList from './OptionList';
import { DashboardSection } from '@/components/common';

export default function OptionPage() {
  return (
    <DashboardSection
      title="オプション一覧"
      backLink="/dashboard"
      backLinkTitle="ダッシュボード"
      infoBtn={{ text: 'オプション追加', link: '/dashboard/option/add' }}
    >
      <OptionList />
    </DashboardSection>
  );
}
