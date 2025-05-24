import type { Metadata } from 'next'
import { preloadQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { Sidebar } from '@/components/common'
import { getTenantAndOrganizationAuth } from '@/lib/auth/getTenantAndOrganizationAuth'
import '../../globals.css'
import { ThemeProvider } from 'next-themes'
import { ChannelTalkLoader } from '@/components/common/ChannelTalkLoader'
import { ApplicationError } from '@/lib/errors/custom_errors'
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants'

export const metadata: Metadata = {
  title: 'Bocker - ダッシュボード',
  description: 'Bockerはサロンの予約管理を便利にするサービスです。',
  icons: {
    icon: '/convex.svg',
  },
}
// global.d.ts
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ChannelIO?: (command: string, options?: any) => void
    ChannelIOInitialized?: boolean
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { userId, orgId, token, tenantId } = await getTenantAndOrganizationAuth()

  if (!orgId || !tenantId) {
    throw new ApplicationError('orgId is required', {
      statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
      severity: ERROR_SEVERITY.ERROR,
      message: 'orgId is required',
      callFunc: 'getTenantAndOrganizationAuth - /dashboard/layout.tsx',
      details: {
        user_id: userId,
        org_id: orgId,
        token: token,
      },
    })
  }

  const preloadedOrganization = await preloadQuery(
    api.organization.query.findByTenantAndOrg,
    {
      tenant_id: tenantId,
      org_id: orgId,
    },
    {
      token: token,
    }
  )

  const preloadedTenant = await preloadQuery(
    api.tenant.query.findByUserId,
    { user_id: userId },
    {
      token: token,
    }
  )

  return (
    <>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        storageKey="dashboard-theme"
        enableSystem
      >
        <Sidebar preloadedOrganization={preloadedOrganization} preloadedTenant={preloadedTenant}>
          {children}
        </Sidebar>
      </ThemeProvider>

      <ChannelTalkLoader />
    </>
  )
}
