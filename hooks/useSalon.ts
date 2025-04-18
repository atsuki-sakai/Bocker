"use client";

import { api } from "@/convex/_generated/api";
import { useQuery } from 'convex/react';
import { Id } from '@/convex/_generated/dataModel';
import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
/**
 * サロンのデータを取得するためのReactフック
 */
export const useSalon = () => {
  const [error, setError] = useState<Error | null>(null);
  const { user } = useUser();

  let salonData: any;

  salonData = useQuery(
    api.salon.core.query.findByClerkId,
    user?.id ? { clerkId: user.id } : 'skip'
  );

  console.log('##########################');
  console.log('user', user?.id);
  console.log('salonData', salonData);
  console.log('##########################');
  // エラーハンドリング
  useEffect(() => {
    if (salonData === undefined && user?.id) {
      setError(new Error('サロンデータを取得できませんでした'));
    } else {
      setError(null);
    }
  }, [salonData, user?.id]);

  return {
    salon: salonData,
    salonId: salonData?._id as Id<'salon'> | undefined,
    isLoading: salonData === undefined && user?.id !== undefined && !error,
    error,
    stripeConnectStatus: salonData?.stripeConnectStatus,
  };
};
