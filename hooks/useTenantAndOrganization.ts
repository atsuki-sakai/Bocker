'use client';

import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Id } from '@/convex/_generated/dataModel';
import type { Role } from '@/convex/types';

type UseTenantAndOrganization = {
  tenantId: Id<'tenant'> | null;
  orgId: Id<'organization'> | null;
  userId: string | null;
  role: Role | null;
  isLoaded: boolean;
  isSignedIn: boolean;
};

export function useTenantAndOrganization(): UseTenantAndOrganization {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  const { userId, isLoaded, isSignedIn } = useAuth();
  
  useEffect(() => {
    if (isLoaded && !isSignedIn && pathname !== '/sign-in') {
      router.replace('/sign-in');
    }
  }, [isLoaded, isSignedIn, pathname, router, user]);

  // user ロード後にメタデータを読む
  const tenantId = useMemo(
    () => (isLoaded ? (user?.publicMetadata?.tenant_id as Id<'tenant'> | null) : null),
    [isLoaded, user]
  );

  const orgId = useMemo(
    () => (isLoaded ? (user?.publicMetadata?.org_id as Id<'organization'> | null) : null),
    [isLoaded, user]
  );

  const role = useMemo(
    () => (isLoaded ? (user?.publicMetadata?.role as Role | null) : null),
    [isLoaded, user]
  );


  return {
    tenantId: tenantId,
    orgId: orgId,
    userId: userId as string | null,
    role: role,
    isLoaded,
    isSignedIn: isSignedIn as boolean,
  };
}