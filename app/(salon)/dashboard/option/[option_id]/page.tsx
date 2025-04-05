import { DashboardSection } from '@/components/common';
import OptionDetail from './OptionDetail';

interface OptionDetailPageProps {
  params: Promise<{
    option_id: string;
  }>;
}

export default async function OptionDetailPage({ params }: OptionDetailPageProps) {
  const { option_id } = await params;
  return (
    <DashboardSection title="オプション詳細" backLink="/dashboard" backLinkTitle="オプション一覧">
      <OptionDetail option_id={option_id} />
    </DashboardSection>
  );
}
