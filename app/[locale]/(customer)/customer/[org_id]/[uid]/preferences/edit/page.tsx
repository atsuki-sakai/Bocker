import { redirect } from 'next/navigation'
import { validateCustomerAccess } from '@/lib/auth/customer'
import { CarteRepository } from '@/services/supabase/repositories'
import { PreferencesEditPageClient } from './PreferencesEditPageClient'

interface PageProps {
  params: Promise<{
    org_id: string
    uid: string
  }>
}

export default async function PreferencesEditPage({ params }: PageProps) {
  const { org_id, uid } = await params

  // 認証とアクセス権限の検証
  const { isValid, session, error } = await validateCustomerAccess(uid, org_id)

  if (!isValid || !session) {
    console.error('[PreferencesEditPage] Access denied:', error)
    redirect(`/customer/${org_id}/auth/login`)
  }

  try {
    const carteRepo = new CarteRepository()
    
    // カルテ情報の取得
    const carte = await carteRepo.findByCustomer(session.tenantId, session.orgId, uid)

    return (
      <PreferencesEditPageClient
        orgId={org_id}
        customerUid={uid}
        tenantId={session.tenantId}
        sessionOrgId={session.orgId}
        initialData={{
          carte,
        }}
      />
    )
  } catch (error) {
    console.error('[PreferencesEditPage] Failed to fetch data:', error)
    redirect(`/customer/${org_id}/auth/login`)
  }
}