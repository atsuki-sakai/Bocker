'use client'

import { Id } from '@/convex/_generated/dataModel'
import { Loading } from './'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'

export default function OrganizationForm() {
  const { tenantId, isLoaded } = useTenantAndOrganization()
  if (!isLoaded) {
    return <Loading />
  }
  return <OrganizationListForm tenantId={tenantId!} />
}

const OrganizationListForm = ({ tenantId }: { tenantId: Id<'tenant'> }) => {
  return (
    <div className="flex justify-center items-center h-screen">
      OrganizationListForm: {tenantId}
    </div>
  )
}
