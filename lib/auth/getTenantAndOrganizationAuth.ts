import { auth } from '@clerk/nextjs/server';

/**
 * サーバー上でConvexの認証を行う
 * @returns ユーザーIDとトークン
 */
/**
 * FIXME: tenantIdを取得する方法を考える。初回にwebhookで作成されるため、その時に取得したいがどうするか。。。
 */
export async function getTenantAndOrganizationAuth() {
    const { userId, getToken, orgId } = await auth();
    const token = await getToken({ template: 'convex'});
    console.log('token', token)
    console.log('orgId', orgId)
    console.log('userId', userId)
    if (!token) {
        throw new Error('Token is required');
    }

    // JWTトークンをデコード
    const payload = JSON.parse(atob(token.split('.')[1]));
    const tenantId = payload.tenant_id;
    const role = payload.role;
    if (!tenantId || !orgId || !userId || !role) {
        throw new Error('TenantId, OrgId, and UserId are required');
    }

    return { userId, token, orgId, tenantId, role };
  }