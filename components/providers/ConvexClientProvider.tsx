"use client";

import { ReactNode } from 'react';
import { ConvexReactClient } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexQueryCacheProvider } from 'convex-helpers/react/cache/provider';
import { useAuth } from '@clerk/nextjs';
import { getEnv } from '@/lib/env-config'

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convexClient = new ConvexReactClient(getEnv('NEXT_PUBLIC_CONVEX_URL'))
  return (
    <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
      <ConvexQueryCacheProvider>{children}</ConvexQueryCacheProvider>
    </ConvexProviderWithClerk>
  )
}
