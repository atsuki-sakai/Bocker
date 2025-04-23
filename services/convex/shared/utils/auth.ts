/**
 * 認証ユーティリティ
 *
 * このモジュールはアプリケーションの認証関連の機能を提供します。
 * ユーザー認証チェックや権限管理などの機能を一元化します。
 */

import { MutationCtx, QueryCtx, ActionCtx } from '../../../../convex/_generated/server';
import { Id } from '../../../../convex/_generated/dataModel';
import type { UserIdentity } from 'convex/server';
import type { Role } from '../types/common';
import { throwConvexError } from '@/lib/error';

/**
 * 認証チェック - ユーザーが認証されているかを確認
 *
 * @param ctx Convexコンテキスト
 * @param skipCheck チェックをスキップするかどうか（オプション）
 * @returns UserIdentity | null
 * @throws 認証エラー
 */
export async function checkAuth(
  ctx: MutationCtx | QueryCtx | ActionCtx,
  skipCheck: boolean = false
): Promise<UserIdentity | null> {
  if (skipCheck) {
    return null;
  }

  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw throwConvexError({
      message: '認証されていないユーザーです',
      status: 401,
      code: 'AUTHENTICATION',
      title: '認証されていないユーザーです',
      callFunc: 'checkAuth',
      severity: 'low',
      details: {
        identity,
      },
    });
  }

  return identity;
}

/**
 * サロンアクセス権限チェック - ユーザーが特定のサロンへのアクセス権を持っているかを確認
 *
 * @param ctx Convexコンテキスト
 * @param salonId サロンID
 * @param allowAdmin 管理者アクセスを許可するか
 * @param skipCheck 認証チェックをスキップするかどうか
 * @returns 認証が成功したらtrue
 * @throws 認証/権限エラー
 */
export async function checkSalonAccess(
  ctx: MutationCtx | QueryCtx,
  salonId: Id<'salon'>,
  allowAdmin: boolean = true,
  skipCheck: boolean = false
): Promise<boolean> {
  // skipCheckがtrueの場合は認証チェックをスキップ
  if (skipCheck) {
    // サロンの存在チェックのみ行う
    const salon = await ctx.db.get(salonId);
    if (!salon) {
      throw throwConvexError({
        message: 'サロンが見つかりません',
        status: 403,
        code: 'AUTHORIZATION',
        title: 'サロンが見つかりません',
        callFunc: 'checkSalonAccess',
        severity: 'low',
        details: {
          salonId,
        },
      });
    }
    return true;
  }

  const identity = await checkAuth(ctx);

  // サロンとユーザーの関連をチェック
  const salon = await ctx.db.get(salonId);
  if (!salon) {
    throw throwConvexError({
      message: 'サロンが見つかりません',
      status: 403,
      code: 'AUTHORIZATION',
      title: 'サロンが見つかりません',
      callFunc: 'checkSalonAccess',
      severity: 'low',
      details: {
        salonId,
      },
    });
  }

  // 管理者の場合は常に許可（設定に応じて）
  if (allowAdmin && isAdmin(identity)) {
    return true;
  }

  return true;
}

/**
 * 管理者チェック - ユーザーが管理者かどうかを確認
 *
 * @param identity ユーザー認証情報
 * @returns 管理者であればtrue
 */
export function isAdmin(identity: UserIdentity | null): boolean {
  if (!identity) {
    throw throwConvexError({
      message: '認証されていないユーザーです',
      status: 401,
      code: 'AUTHENTICATION',
      title: '認証されていないユーザーです',
      callFunc: 'isAdmin',
      severity: 'low',
      details: {
        identity,
      },
    });
  }
  const orgs = identity.org_role;
  return Boolean(orgs && Object.values(orgs).some((role) => ['owner', 'admin'].includes(role)));
}

/**
 * スタッフアクセス権限チェック - スタッフが特定のアクションへのアクセス権を持っているかを確認
 *
 * @param ctx Convexコンテキスト
 * @param staffId スタッフID
 * @param requiredRole 必要な権限レベル（オプション）
 * @returns 認証が成功したらtrue
 * @throws 認証/権限エラー
 */
export async function checkStaffAccess(
  ctx: MutationCtx | QueryCtx,
  staffId: Id<'staff'>,
  requiredRole: Role = 'staff'
): Promise<boolean> {
  // スタッフ認証情報を取得（PINコードや特定の認証情報）
  // ここではCtxからスタッフ情報を取得する想定
  const staffAuth = await ctx.db
    .query('staff_auth')
    .withIndex('by_staff_id', (q) => q.eq('staffId', staffId))
    .first();

  if (!staffAuth) {
    throw throwConvexError({
      message: 'スタッフ認証情報が見つかりません',
      status: 401,
      code: 'AUTHENTICATION',
      title: 'スタッフ認証情報が見つかりません',
      callFunc: 'checkStaffAccess',
      severity: 'low',
      details: {
        staffId,
      },
    });
  }

  // 権限レベルのチェック
  const roleLevel = {
    admin: 4,
    owner: 3,
    manager: 2,
    staff: 1,
  };

  const staffRoleLevel = roleLevel[staffAuth.role || 'staff'];
  const requiredRoleLevel = roleLevel[requiredRole];

  if (staffRoleLevel < requiredRoleLevel) {
    throw throwConvexError({
      message: 'この操作を行う権限がありません',
      status: 403,
      code: 'AUTHORIZATION',
      title: 'この操作を行う権限がありません',
      callFunc: 'checkStaffAccess',
      severity: 'low',
      details: {
        staffId,
        currentRole: staffAuth.role,
        requiredRole,
      },
    });
  }
  return true;
}
