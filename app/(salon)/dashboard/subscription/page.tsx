import SubscriptionForm from "./SubscriptionForm";
import { preloadQuery, preloadedQueryResult } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function SubscriptionPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const salonPreloaded = await preloadQuery(api.salon.core.getClerkId, { clerkId: userId });
  // preloadedQueryResultを使用してサーバー側でデータにアクセス
  const salon = preloadedQueryResult(salonPreloaded);
  if (!salon?.stripeCustomerId) {
    redirect("/dashboard/subscription");
  }
  const subscriptionPreloaded = await preloadQuery(api.subscription.core.get, { stripeCustomerId: salon?.stripeCustomerId });

  return <SubscriptionForm salonPreloaded={salonPreloaded} subscriptionPreloaded={subscriptionPreloaded} />;
}
