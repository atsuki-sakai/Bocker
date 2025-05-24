import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

/**
 * サーバー上でConvexの認証を行う
 * @returns ユーザーIDとトークン
 */
export async function getOrganizationAuth() {
    const { userId, getToken, orgId } = await auth();
    const token = await getToken({ template: 'convex' });

    if (!token) {
        return redirect('/sign-in');
    }

    // JWTトークンをデコード
    const payload = JSON.parse(atob(token.split('.')[1]));
    const tenantId = payload.tenant_id;
    if (!userId || !token || !tenantId || !orgId) {
      return redirect('/sign-in');
    }
    return { userId, token, orgId, tenantId };
  }