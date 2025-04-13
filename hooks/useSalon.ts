"use client";

import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { Id } from "@/convex/_generated/dataModel";
import { useEffect, useState } from "react";

/**
 * サロンのデータを取得するためのReactフック
 */
export const useSalon = () => {
  const [error, setError] = useState<Error | null>(null);
  const { user } = useUser();
  
  // clerkIdが未定義の場合はデータ取得をスキップ
  const salonData = useQuery(
    api.salon.core.query.findByClerkId,
    user?.id ? { clerkId: user.id } : 'skip'
  );

  console.log("salonData", salonData);

  // エラーハンドリング
  useEffect(() => {
    if (salonData === undefined && user?.id) {
      setError(new Error("サロンデータを取得できませんでした"));
    } else {
      setError(null);
    }
  }, [salonData, user]);

  return {
    salon: salonData,
    isLoading: salonData === undefined && user?.id !== undefined && !error,
    error,
    stripeConnectStatus: salonData?.stripeConnectStatus,
    salonId: salonData?._id as Id<'salon'> | undefined,
  };
};
