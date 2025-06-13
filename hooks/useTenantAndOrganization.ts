'use client';

import { useUser, useAuth } from '@clerk/nextjs';
import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Id, Doc } from '@/convex/_generated/dataModel';
import type { Role } from '@/convex/types';
import { api } from '@/convex/_generated/api';
import { useQuery } from 'convex/react';
import { SubscriptionPlanName, SubscriptionStatus } from '@/convex/types';

type UseTenantAndOrganization = {
  tenantId: Id<'tenant'> | null;
  orgId: Id<'organization'> | null;
  userId: string | null;
  role: Role | null;
  staffId: Id<'staff'> | null;
  subscriptionStatus: SubscriptionStatus | null;
  planName: SubscriptionPlanName | null;
  subscription: Doc<"subscription"> | null | undefined;
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
  const [retryCount, setRetryCount] = useState(0);

  // 不要なuseMemoを削除し、直接計算
  const tenantId = isLoaded ? (user?.publicMetadata?.tenant_id as Id<'tenant'> | null) : null;
  const role = isLoaded ? (user?.publicMetadata?.role as Role | null) : null;
  const staffId = isLoaded ? (user?.publicMetadata?.staff_id as Id<'staff'> | null) : null;

  const org = useQuery(api.organization.query.getActiveOrganization, tenantId ? {
    tenant_id: tenantId,
  } : 'skip');

  const subscription = useQuery(api.tenant.subscription.query.getSubscription, tenantId ? {
    tenant_id: tenantId
  } : 'skip');

  const ready = isLoaded && !!tenantId && !!org?._id && !!role;

  useEffect(() => {
    // 未サインインならサインインページへリダイレクト
    if (isLoaded && !isSignedIn && pathname !== '/sign-in') {
      router.replace('/sign-in');
      return;
    }

    // メタデータが揃うまで Clerk セッションをリロード（最大3回まで）
    if (isLoaded && isSignedIn && !ready && retryCount < 3) {
      const id = setTimeout(() => {
        session?.reload();
        setRetryCount(prev => prev + 1);
      }, 3_000);

      return () => clearTimeout(id);
    }
  }, [isLoaded, isSignedIn, pathname, ready, retryCount, session?.id]);

  return {
    tenantId: tenantId,
    orgId: org?._id ?? null,
    userId: userId as string | null,
    role: role,
    staffId: staffId,
    planName: subscription?.plan_name ?? 'UNKNOWN',
    subscriptionStatus: subscription?.status ?? null,
    subscription: subscription,
    isLoaded,
    isSignedIn: isSignedIn as boolean,
    ready,
  };
}