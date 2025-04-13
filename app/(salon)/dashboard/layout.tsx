import type { Metadata } from 'next';
import { preloadQuery } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';
import { Sidebar } from '@/components/common';
import { serverConvexAuth } from '@/lib/auth/auth-server';
import '../../globals.css';

export const metadata: Metadata = {
  title: 'Bcker/ブッカー - Dashboard',
  description: 'Bcker/ブッカーはサロンの予約管理を便利にするサービスです。',
  icons: {
    icon: '/convex.svg',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId, token } = await serverConvexAuth();

  const preloadedSalon = await preloadQuery(
    api.salon.core.query.findByClerkId,
    { clerkId: userId },
    { token: token }
  );


  console.log('preloadedSalon', preloadedSalon);

  return <Sidebar preloadedSalon={preloadedSalon}>{children}</Sidebar>;
}
