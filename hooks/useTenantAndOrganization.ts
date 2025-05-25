'use client';

import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Id } from '@/convex/_generated/dataModel';
import type { Role } from '@/convex/types';

type UseTenantAndOrganization = {
  tenantId: Id<'tenant'> | null;
  orgId: string | null;
  userId: string | null;
  orgRole: Role | null;
  isLoaded: boolean;
  isSignedIn: boolean;
};

export function useTenantAndOrganization(): UseTenantAndOrganization {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  const { orgRole, orgId, userId, isLoaded, isSignedIn } = useAuth();
  // 未ログインなら /sign-in へ
  useEffect(() => {
    if (isLoaded && !isSignedIn && pathname !== '/sign-in') {
      router.replace('/sign-in');
    }
  }, [isLoaded, isSignedIn, pathname, router]);

  // user ロード後にメタデータを読む
  const tenantId = useMemo(
    () => (isLoaded ? (user?.publicMetadata?.tenant_id as string | null) : null),
    [isLoaded, user]
  );

  let formattedOrgRole: Role | null = null
  if(orgRole) {
    formattedOrgRole = orgRole.split(':')[1] as Role
  }

  return {
    tenantId: tenantId as Id<'tenant'> | null,
    orgId: orgId as string | null,
    userId: userId as string | null,
    orgRole: formattedOrgRole || null,
    isLoaded,
    isSignedIn: isSignedIn as boolean,
  };
}