import OptionAddForm from './OptionAddForm';
import { DashboardSection } from '@/components/common';

export default function OptionAddPage() {
  return (
    <DashboardSection
      title="オプションを作成"
      backLink="/dashboard/option"
      backLinkTitle="オプション一覧"
    >
      <OptionAddForm />
    </DashboardSection>
  );
}
