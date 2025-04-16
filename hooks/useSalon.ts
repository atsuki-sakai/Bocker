"use client";

import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useOrganization } from '@clerk/nextjs';
import { Id } from '@/convex/_generated/dataModel';
import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
/**
 * サロンのデータを取得するためのReactフック
 */
export const useSalon = () => {
  const [error, setError] = useState<Error | null>(null);
  const { organization } = useOrganization();
  const { user } = useUser();

  let salonData: any;
  // organizationIdが未定義の場合はデータ取得をスキップ
  if (organization?.id) {
    salonData = useQuery(
      api.salon.core.query.findByOrganizationId,
      organization?.id ? { organizationId: organization.id } : 'skip'
    );
  } else {
    salonData = useQuery(
      api.salon.core.query.findByClerkId,
      user?.id ? { clerkId: user.id } : 'skip'
    );
  }

  console.log('salonData', salonData);

  // エラーハンドリング
  useEffect(() => {
    if (salonData === undefined && organization?.id) {
      setError(new Error('サロンデータを取得できませんでした'));
    } else {
      setError(null);
    }
  }, [salonData, organization]);

  return {
    salon: salonData,
    salonId: salonData?._id as Id<'salon'> | undefined,
    isLoading: salonData === undefined && organization?.id !== undefined && !error,
    error,
    stripeConnectStatus: salonData?.stripeConnectStatus,
  };
};
