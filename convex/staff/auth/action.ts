'use node';

import { v } from 'convex/values';
import { action } from '../../_generated/server';
import { Role, roleType } from '@/services/convex/shared/types/common';
import { ClerkError } from '@/services/convex/shared/utils/error';
import { clerkClient } from '@clerk/nextjs/server';
import type { User } from '@clerk/nextjs/server';
import { retryOperation } from '@/lib/utils';

/**
 * Clerkの組織にスタッフを招待する
 */

const clerk = await clerkClient();

const checkClerkApiKey = () => {
  const clerkApiKey = process.env.CLERK_SECRET_KEY!;
  if (!clerkApiKey) {
    throw new ClerkError('high', 'Clerk APIキーが設定されていません', 'INTERNAL_ERROR', 500);
  }
};

export const inviteStaffToOrganization = action({
  args: {
    organizationId: v.string(), // 加入させる組織のID
    inviterUserId: v.string(), // 招待を送るユーザーのID
    email: v.string(), // 招待を送るメールアドレス
    role: v.union(roleType), // 招待する権限ロール
    firstName: v.string(), // 招待するユーザーの名前
    lastName: v.string(), // 招待するユーザーの苗字
    password: v.string(), // 招待するユーザーのパスワード
  },
  handler: async (ctx, args) => {
    checkClerkApiKey();
    try {
      let user: User | null = null;
      // 最もシンプルな形でテスト
      try {
        await retryOperation(async () => {
          await clerk.organizations.createOrganizationInvitation({
            organizationId: args.organizationId,
            emailAddress: args.email,
            role: toggleRoleToClerkRole(args.role),
          });
        });

        user = await retryOperation(async () => {
          return await clerk.users.createUser({
            firstName: args.firstName,
            lastName: args.lastName,
            emailAddress: [args.email],
            password: args.password,
          });
        });

        if (!user) {
          const err = new ClerkError('high', 'ユーザーの作成に失敗しました', 'INTERNAL_ERROR', 500);
          throw err;
        }

        await retryOperation(async () => {
          await clerk.organizations.createOrganizationMembership({
            organizationId: args.organizationId,
            userId: user!.id,
            role: toggleRoleToClerkRole(args.role),
          });
        });

        return {
          success: true,
          userId: user.id,
          action: 'invited',
          message: `${args.email}を新しいメンバーとして招待しました`,
        };
      } catch (clerkError: any) {
        // ClerkのAPIエラーを確認
        if (
          'errors' in clerkError &&
          clerkError.errors?.[0]?.code === 'already_a_member_in_organization'
        ) {
          return {
            success: true,
            action: 'already_member',
            message: `${args.email}は既に組織のメンバーです。`,
          };
        }
        throw clerkError;
      }
    } catch (error) {
      const err = new ClerkError(
        'high',
        'スタッフ追加/更新中にエラーが発生しました',
        'INTERNAL_ERROR',
        500,
        {
          clerkError: JSON.stringify(error),
        }
      );
      throw err;
    }
  },
});

/**
 * 組織メンバーの権限を更新する
 */
export const updateRole = action({
  args: {
    organizationId: v.string(), // 加入させる組織のID
    userId: v.string(), // 更新するユーザーのID
    role: v.union(roleType), // 更新する権限ロール
  },
  handler: async (ctx, args) => {
    checkClerkApiKey();

    await retryOperation(async () => {
      await clerk.organizations.updateOrganizationMembership({
        organizationId: args.organizationId,
        userId: args.userId,
        role: toggleRoleToClerkRole(args.role),
      });
    });
  },
});

export const deleteClerkMemberAndUser = action({
  args: {
    organizationId: v.string(),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    checkClerkApiKey();

    await retryOperation(async () => {
      return await clerk.organizations.deleteOrganizationMembership({
        organizationId: args.organizationId,
        userId: args.clerkId,
      });
    });

    const user = await retryOperation(async () => {
      return await clerk.users.getUser(args.clerkId);
    });

    console.log('user', user);
    if (user?.publicMetadata?.role === 'org:admin') {
      console.log('user', user.publicMetadata.role);
      await retryOperation(async () => {
        await clerk.users.deleteUser(args.clerkId);
      });
    }
  },
});

/**
 * アプリケーションのロールをClerkのロールに変換する
 * @param role アプリケーションのロール
 * @returns Clerkのロール
 */
export const toggleRoleToClerkRole = (
  role: Role | 'org:staff' | 'org:manager' | 'org:owner'
): 'org:staff' | 'org:manager' | 'org:owner' | Role => {
  switch (role) {
    case 'staff':
      return 'org:staff';
    case 'manager':
      return 'org:manager';
    case 'owner':
      return 'org:owner';
    case 'org:staff':
      return 'staff';
    case 'org:manager':
      return 'manager';
    case 'org:owner':
      return 'owner';
    default:
      const error = new ClerkError('low', '不正なロールが指定されました', 'INVALID_ARGUMENT', 400, {
        role,
        function: 'mapRoleToClerkRole',
      });
      throw error;
  }
};
