"use client";

import { ReactNode, useState } from 'react';
import { ConvexReactClient } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexQueryCacheProvider } from 'convex-helpers/react/cache/provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  const [convexClient] = useState(() => new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!));
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5分
            gcTime: 10 * 60 * 1000, // 10分
          },
        },
      })
  );

  return (
    <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
      <QueryClientProvider client={queryClient}>
        <ConvexQueryCacheProvider>{children}</ConvexQueryCacheProvider>
      </QueryClientProvider>
    </ConvexProviderWithClerk>
  );
}
