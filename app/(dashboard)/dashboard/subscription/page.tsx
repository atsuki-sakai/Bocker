import SubscriptionForm from './SubscriptionForm'
import { preloadQuery, preloadedQueryResult } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'

export default async function SubscriptionPage() {
  const { userId, orgId, getToken } = await auth()
  const token = await getToken({ template: 'convex' })

  if (!userId || !orgId || !token) {
    redirect('/sign-in')
  }

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
