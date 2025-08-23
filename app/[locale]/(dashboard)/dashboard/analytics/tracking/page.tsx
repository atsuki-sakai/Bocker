import { getOrganizationAuth } from '@/lib/auth/getOrganizationAuth'
import TrackingDashboard from '@/components/tracking/TrackingDashboard'

export default async function TrackingPage() {
  const { orgId } = await getOrganizationAuth()
  if (!orgId) {
    return <div>Organization ID is missing.</div>
  }

  return <TrackingDashboard orgId={orgId} />
}