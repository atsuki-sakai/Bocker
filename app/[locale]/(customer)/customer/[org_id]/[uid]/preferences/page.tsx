import { redirect } from 'next/navigation'
import { validateCustomerAccess } from '@/lib/auth/customer'
import { CarteRepository } from '@/services/supabase/repositories'
import { PreferencesPageClient } from './PreferencesPageClient'

interface PageProps {
  params: Promise<{
    org_id: string
    uid: string
  }>
}

export default async function PreferencesPage({ params }: PageProps) {
  const { org_id, uid } = await params

  // 認証とアクセス権限の検証
  const { isValid, session, error } = await validateCustomerAccess(uid, org_id)

  if (!isValid || !session) {
    console.error('[PreferencesPage] Access denied:', error)
    redirect(`/customer/${org_id}/auth/login`)
  }

  try {
    const carteRepo = new CarteRepository()
    
    // カルテ情報の取得
    const carte = await carteRepo.findByCustomer(session.tenantId, session.orgId, uid)

    return (
      <PreferencesPageClient
        orgId={org_id}
        customerUid={uid}
        carte={carte}
      />
    )
  } catch (error) {
    console.error('[PreferencesPage] Failed to fetch data:', error)
    redirect(`/customer/${org_id}/auth/login`)
  }
}