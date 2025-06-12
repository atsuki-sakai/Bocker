import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation'
import { UserMetadata } from '@/services/webhook/clerk/types'
import { Id } from '@/convex/_generated/dataModel'
import { Role } from '@/convex/types'

/**
 * サーバー上でConvexの認証を行う（API Route用）
 * @returns ユーザーIDとトークン
 * @throws Error 認証エラーの場合
 */
/**
 * FIXME: tenantIdを取得する方法を考える。初回にwebhookで作成されるため、その時に取得したいがどうするか。。。
 */
export async function getOrganizationAuth(): Promise<{
    tenantId: Id<'tenant'>
    userId: string
    orgId: Id<'organization'>
    role: Role
    token: string
}> {
    console.log('[getOrganizationAuth] Starting authentication check')
    
    const { userId, getToken } = await auth()
    console.log('[getOrganizationAuth] auth() result:', { hasUserId: !!userId })
    
    const user = await currentUser()
    console.log('[getOrganizationAuth] currentUser() result:', { hasUser: !!user })
    
    const token = await getToken({ template: 'convex' })
    console.log('[getOrganizationAuth] getToken() result:', { hasToken: !!token, tokenLength: token?.length })
  
    if (!userId || !token || !user) {
      console.error('[getOrganizationAuth] Authentication failed:', { userId, hasToken: !!token, hasUser: !!user })
      throw new Error('Unauthorized: User not authenticated')
    }
  
    const metadata = user.publicMetadata as UserMetadata
  
    if (!metadata.org_id || !metadata.tenant_id || metadata.role === null) {
      console.error('ユーザー情報が不正です。必要なメタデータが不足しています', {
        userId,
        hasMetadata: !!metadata,
        hasOrgId: !!metadata?.org_id,
        hasTenantId: !!metadata?.tenant_id,
        hasRole: metadata?.role !== null && metadata?.role !== undefined
      })
      throw new Error('Unauthorized: Invalid user metadata')
    }

    return { userId, orgId: metadata.org_id, role: metadata.role, token, tenantId: metadata.tenant_id }
  }

/**
 * ページコンポーネント用の認証関数（リダイレクト付き）
 */
export async function getOrganizationAuthForPage(): Promise<{
    tenantId: Id<'tenant'>
    userId: string
    orgId: Id<'organization'>
    role: Role
    token: string
}> {
    const { userId, getToken } = await auth()
    const user = await currentUser()
    const token = await getToken({ template: 'convex' })
  
    if (!userId || !token || !user) {
      redirect('/sign-in')
    }
  
    const metadata = user.publicMetadata as UserMetadata
  
    if (!metadata.org_id || !metadata.tenant_id || metadata.role === null) {
      console.error('ユーザー情報が不正です。必要なメタデータが不足しています')
      redirect('/sign-in')
    }

    return { userId, orgId: metadata.org_id, role: metadata.role, token, tenantId: metadata.tenant_id }
  }