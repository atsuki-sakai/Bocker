import { CustomerLayout } from '@/components/common/CustomerLayout';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{
    org_id: string;
    uid: string;
  }>;
}

export default async function Layout({ children, params }: LayoutProps) {
  const { org_id, uid } = await params;
  
  return (
    <CustomerLayout 
      customerUid={uid} 
      orgId={org_id}
    >
      {children}
    </CustomerLayout>
  );
}