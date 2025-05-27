import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation'
import { UserMetadata } from '@/services/webhook/clerk/types'
import { Id } from '@/convex/_generated/dataModel'
import { Role } from '@/convex/types'

/**
 * サーバー上でConvexの認証を行う
 * @returns ユーザーIDとトークン
 */
/**
 * FIXME: tenantIdを取得する方法を考える。初回にwebhookで作成されるため、その時に取得したいがどうするか。。。
 */
export async function getOrganizationAuth(): Promise<{
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
  
    if (!metadata.org_id || !metadata.role) {
      redirect('/dashboard')
    }

    return { userId, orgId: metadata.org_id, role: metadata.role, token }
  }