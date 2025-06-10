'use client';

import OptionList from './OptionList';
import { DashboardSection, withManagerAccess } from '@/components/common';

function OptionPage() {
  return (
    <DashboardSection
      title="オプション一覧"
      backLink="/dashboard"
      backLinkTitle="ダッシュボード"
      infoBtn={{ text: 'オプションを作成', link: '/dashboard/option/add' }}
    >
      <div className="flex flex-col gap-2">
        <p className="text-sm text-gray-500">
          オプションはスタイリング剤、トリートメントなど物販などアップセルにご利用いただけます。
        </p>
      </div>
      <OptionList />
    </DashboardSection>
  )
}

export default withManagerAccess(OptionPage);
