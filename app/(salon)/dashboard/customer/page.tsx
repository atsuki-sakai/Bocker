"use client";

import { useAuth } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Loading } from "@/components/common";
import { useQuery } from "convex/react";
import { useEffect } from "react";
import { useSalon } from "@/hooks/useSalon";

export default function CustomerPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { salonId, isLoading: isSalonLoading } = useSalon();
  
  const isSubscribed = useQuery(
    api.subscription.core.isSubscribed,
    salonId ? { salonId } : "skip"
  );

  useEffect(() => {
    if (isSubscribed !== undefined) {
      console.log(isSubscribed);
    }
  }, [isSubscribed]);

  if (!isLoaded || !isSignedIn || isSalonLoading) {
    return <Loading />;
  }

  if (isSubscribed === undefined) {
    return <Loading />;
  }

  return (
    <div>
      <h1>CustomerPage</h1>
      <p>購読状態: {isSubscribed ? "購読中" : "未購読"}</p>
    </div>
  );
}