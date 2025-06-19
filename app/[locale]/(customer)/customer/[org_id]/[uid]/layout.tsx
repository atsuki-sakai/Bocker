import { CustomerLayout } from '@/components/common/CustomerLayout';

interface LayoutProps {
  children: React.ReactNode;
  params: {
    org_id: string;
    uid: string;
  };
}

export default async function Layout({ children, params }: LayoutProps) {
  return (
    <CustomerLayout 
      customerUid={params.uid} 
      orgId={params.org_id}
    >
      {children}
    </CustomerLayout>
  );
}