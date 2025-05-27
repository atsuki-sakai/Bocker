'use client';

import { useUser, useAuth } from '@clerk/nextjs';
import { useClerk } from '@clerk/nextjs';
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
  ready: boolean;
};

export function useTenantAndOrganization(): UseTenantAndOrganization {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  const { userId, isLoaded, isSignedIn } = useAuth();
  const { session } = useClerk();

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

  const ready = isLoaded && !!tenantId && !!orgId && !!role;

  useEffect(() => {
    // 未サインインならサインインページへリダイレクト
    if (isLoaded && !isSignedIn && pathname !== '/sign-in') {
      router.replace('/sign-in');
      return;
    }

    // メタデータが揃うまで Clerk セッションを 3 秒ごとにリロード
    if (isLoaded && isSignedIn && !ready) {
      const id = setInterval(() => {
        session?.reload();
      }, 3_000);

      return () => clearInterval(id);
    }
  }, [isLoaded, isSignedIn, pathname, ready, session]);

  return {
    tenantId: tenantId,
    orgId: orgId,
    userId: userId as string | null,
    role: role,
    isLoaded,
    isSignedIn: isSignedIn as boolean,
    ready,
  };
}