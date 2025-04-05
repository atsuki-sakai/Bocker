import OptionEditForm from './OptionEditForm';
import { DashboardSection } from '@/components/common';

export default function OptionEditPage() {
  return (
    <DashboardSection title="オプション編集" backLink="/dashboard" backLinkTitle="オプション一覧">
      <OptionEditForm />
    </DashboardSection>
  );
}
