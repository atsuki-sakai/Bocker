import SubscriptionForm from './SubscriptionForm'
import { preloadQuery, preloadedQueryResult } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { redirect } from 'next/navigation'
import { getOrganizationAuth } from '@/lib/auth/getOrganizationAuth'

export default async function SubscriptionPage() {
  const { userId, orgId, token } = await getOrganizationAuth()

  const tenantPreloaded = await preloadQuery(
    api.tenant.query.findByUserId,
    { user_id: userId },
    { token: token }
  )
  // preloadedQueryResultを使用してサーバー側でデータにアクセス
  const tenant = preloadedQueryResult(tenantPreloaded)
  if (!tenant?.stripe_customer_id) {
    redirect('/dashboard/subscription')
  }
  const subscriptionPreloaded = await preloadQuery(
    api.tenant.subscription.query.findByStripeCustomerId,
    { stripe_customer_id: tenant?.stripe_customer_id },
    { token: token }
  )

  return (
    <SubscriptionForm
      tenantId={tenant._id}
      orgId={orgId}
      tenantPreloaded={tenantPreloaded}
      subscriptionPreloaded={subscriptionPreloaded}
    />
  )
}
