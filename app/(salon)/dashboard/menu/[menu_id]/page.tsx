// /dashboard/menu/[menu_id]/page.tsx
import { DashboardSection } from '@/components/common';
import { Id } from '@/convex/_generated/dataModel';
import { fetchQuery } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';
import { serverConvexAuth } from '@/lib/auth/auth-server';
import { MenuDetailContent } from './MenuDetailContent';

interface MenuDetailPageProps {
  params: Promise<{
    menu_id: string;
  }>;
}

export default async function MenuDetailPage({ params }: MenuDetailPageProps) {
  const { menu_id } = await params;
  const { token } = await serverConvexAuth();

  let menu = null;
  try {
    menu = await fetchQuery(api.menu.core.get, { menuId: menu_id as Id<'menu'> }, { token });
  } catch (error) {
    console.error('メニュー取得エラー:', error);
    // エラーハンドリングはここで行います
  }

  return (
    <DashboardSection
      title="メニュー詳細"
      backLink="/dashboard/menu"
      backLinkTitle="メニュー設定に戻る"
    >
      <MenuDetailContent menu={menu} />
    </DashboardSection>
  );
}
