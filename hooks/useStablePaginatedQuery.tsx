// hooks/useStablePaginatedQuery.ts
import { useRef } from 'react';
import { usePaginatedQuery } from 'convex/react';

export const useStablePaginatedQuery = ((name, ...args) => {
  const result = usePaginatedQuery(name, ...args);
  const stored = useRef(result);

  if (result.status !== 'LoadingMore') {
    stored.current = result;
  }

  return stored.current;
}) as typeof usePaginatedQuery;
