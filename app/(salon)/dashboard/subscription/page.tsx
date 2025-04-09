import SubscriptionForm from './SubscriptionForm';
import { preloadQuery, preloadedQueryResult } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';
import { serverConvexAuth } from '@/lib/auth/auth-server';
import { redirect } from 'next/navigation';

export default async function SubscriptionPage() {
  const { userId, token } = await serverConvexAuth();

  const salonPreloaded = await preloadQuery(
    api.salon.core.getClerkId,
    { clerkId: userId },
    { token: token }
  );
  // preloadedQueryResultを使用してサーバー側でデータにアクセス
  const salon = preloadedQueryResult(salonPreloaded);
  if (!salon?.stripeCustomerId) {
    redirect('/dashboard/subscription');
  }
  const subscriptionPreloaded = await preloadQuery(
    api.subscription.core.get,
    { stripeCustomerId: salon?.stripeCustomerId },
    { token: token }
  );

  return (
    <SubscriptionForm
      salonPreloaded={salonPreloaded}
      subscriptionPreloaded={subscriptionPreloaded}
    />
  );
}
