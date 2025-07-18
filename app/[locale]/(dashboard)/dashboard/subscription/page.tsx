import SubscriptionForm from './SubscriptionForm'
import { preloadQuery, preloadedQueryResult } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { redirect } from 'next/navigation'
import { getOrganizationAuthForPage } from '@/lib/auth/getOrganizationAuth'
import { Suspense } from 'react'
import { Loading, UnauthorizedAccess } from '@/components/common'
import { hasAccess } from '@/lib/utils'

export default async function SubscriptionPage() {
  const { userId, orgId, token, role, planName } = await getOrganizationAuthForPage()

  // アクセス制御：admin権限が必要
  if (!role || !hasAccess(role, planName ?? 'UNKNOWN', 'admin', 'LITE')) {
    return <UnauthorizedAccess />
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
    <Suspense fallback={<Loading />}>
      <SubscriptionForm
        tenantId={tenant._id}
        orgId={orgId}
        tenantPreloaded={tenantPreloaded}
        subscriptionPreloaded={subscriptionPreloaded}
      />
    </Suspense>
  )
}
