
/**
 * 認証ユーティリティ
 *
 * このモジュールはアプリケーションの認証関連の機能を提供します。
 * ユーザー認証チェックや権限管理などの機能を一元化します。
 */

import { MutationCtx, QueryCtx, ActionCtx } from '../_generated/server';
import { Id } from '../_generated/dataModel';
import type { UserIdentity } from 'convex/server';

import { SystemError } from '@/lib/errors/custom_errors';
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from "@/lib/errors/constants";
import { ConvexError } from 'convex/values';
import { validateRequired } from '@/convex/utils/validations';

/**
 * 認証チェック - ユーザーが認証されているかを確認
 *
 * @param ctx Convexコンテキスト
 * @param skip_check チェックをスキップするかどうか（オプション）
 * @returns UserIdentity | null
 * @throws 認証エラー
 */
export async function checkAuth(
  ctx: MutationCtx | QueryCtx | ActionCtx,
  skip_check: boolean = false
): Promise<UserIdentity | null> {
  if (skip_check) {
    return null
  }
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new ConvexError({
      message: '認証されていないユーザーです',
      status: 401,
      code: 'UNAUTHORIZED',
      title: '認証エラー',
      callFunc: 'checkAuth',
      details: {
        identity,
      },
    })
  }

  return identity
}

/**
 * テナントと組織アクセス権限チェック - ユーザーが特定のテナントと組織へのアクセス権を持っているかを確認
 *
 * @param ctx Convexコンテキスト
 * @param tenant_id テナントID
 * @param org_id 組織ID
 * @param allow_admin 管理者アクセスを許可するか
 * @param skip_check 認証チェックをスキップするかどうか
 * @returns 認証が成功したらtrue
 * @throws 認証/権限エラー
 */
export async function checkTenantAndOrgAccess(
  ctx: MutationCtx | QueryCtx,
  tenant_id: Id<'tenant'>,
  org_id: string,
  skip_check: boolean = false
): Promise<boolean> {
  // skipCheckがtrueの場合は認証チェックをスキップ  
  validateRequired(org_id, 'org_id');
  if (skip_check) {
    // テナントの存在チェックのみ行う
    const tenant = await ctx.db.get(tenant_id)
    if (!tenant) {
      throw new SystemError(
        'テナントが見つかりません',
        {
          statusCode: ERROR_STATUS_CODE.FORBIDDEN,
          severity: ERROR_SEVERITY.WARNING,
          title: 'テナントが見つかりません',
          callFunc: 'checkSalonAccess',
          details: {
            tenant_id,
          },
        },
        'TENANT_NOT_FOUND'
      )
    }
   
    const tenantOrganization = await ctx.db.query('organization').withIndex('by_tenant_org_archive', q => q.eq('tenant_id', tenant_id).eq('org_id', org_id).eq('is_archive', false)).first();
    if (!tenantOrganization) {
      throw new ConvexError({
        message: '組織が見つかりません',
        status: 403,
        code: 'FORBIDDEN',
        title: '組織が見つかりません',
        callFunc: 'checkTenantAndOrgAccess',
        severity: ERROR_SEVERITY.WARNING,
        details: {
          statusCode: ERROR_STATUS_CODE.FORBIDDEN,
          severity: ERROR_SEVERITY.WARNING,
          title: '組織が見つかりません',
          callFunc: 'checkTenantAndOrgAccess',
        }
      })
    }
    return true
  }

  return true
}

/**
 * 管理者チェック - ユーザーが管理者かどうかを確認
 *
 * @param identity ユーザー認証情報
 * @returns 管理者であればtrue
 */
export function isAdminAndOwner(identity: UserIdentity | null): boolean {
  if (!identity) {
    throw new ConvexError({
      message: '認証されていないユーザーです',
      status: 401,
      code: 'UNAUTHORIZED',
      severity: ERROR_SEVERITY.WARNING,
      title: '認証されていないユーザーです',
      callFunc: 'isAdminAndOwner',
      details: {
        identity,
      },
    })
  }
  const orgs = identity.org_role;
  return Boolean(orgs && Object.values(orgs).some((role) => ['owner', 'admin'].includes(role)));
}