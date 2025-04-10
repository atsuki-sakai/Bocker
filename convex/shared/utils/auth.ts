/**
 * 認証ユーティリティ
 *
 * このモジュールはアプリケーションの認証関連の機能を提供します。
 * ユーザー認証チェックや権限管理などの機能を一元化します。
 */

import { MutationCtx, QueryCtx, ActionCtx } from '../../_generated/server';
import { Id } from '../../_generated/dataModel';
import { ConvexCustomError } from './error';
import type { UserIdentity } from 'convex/server';
import type { Role } from '../types/common';

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
    throw new ConvexCustomError('low', '認証されていないユーザーです', 'AUTHENTICATION', 401, {
      identity,
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
 * @returns 認証が成功したらtrue
 * @throws 認証/権限エラー
 */
export async function checkSalonAccess(
  ctx: MutationCtx | QueryCtx,
  salonId: Id<'salon'>,
  allowAdmin: boolean = true
): Promise<boolean> {
  const identity = await checkAuth(ctx);

  // サロンとユーザーの関連をチェック
  const salon = await ctx.db.get(salonId);
  if (!salon) {
    throw new ConvexCustomError('low', 'サロンが見つかりません', 'AUTHORIZATION', 403, { salonId });
  }

  // 管理者の場合は常に許可（設定に応じて）
  if (allowAdmin && isAdmin(identity)) {
    return true;
  }

  // ユーザーIDとサロンのClerkIDを比較
  if (identity && salon.clerkId !== identity.tokenIdentifier) {
    throw new ConvexCustomError('low', 'サロンにアクセスできません', 'AUTHORIZATION', 403, {
      salonId,
    });
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
    throw new ConvexCustomError('low', '認証されていないユーザーです', 'AUTHENTICATION', 401, {
      identity,
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
    throw new ConvexCustomError('low', 'スタッフ認証情報が見つかりません', 'AUTHENTICATION', 401, {
      staffId,
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
    throw new ConvexCustomError('low', 'この操作を行う権限がありません', 'AUTHORIZATION', 403, {
      staffId,
      currentRole: staffAuth.role,
      requiredRole,
    });
  }
  return true;
}
