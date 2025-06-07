'use node'

import { action } from '../../_generated/server';
import { v } from 'convex/values';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { ConvexError } from 'convex/values';
import { ERROR_SEVERITY, ERROR_STATUS_CODE } from '@/lib/errors/constants';

/**
 * Staffのメールアドレス重複チェック(Clerkでのメールアドレス重複チェック)
 */
export const checkEmailAvailability = action({
    args: {
      tenant_id: v.id('tenant'),
      org_id: v.id('organization'),
      email: v.string(),
    },
    handler: async (ctx, args) => {
      try {
        const authData = await auth();
        const clerk = await clerkClient();
        
        if (!authData.userId) {
          throw new ConvexError({
            message: '認証が必要です',
            statusCode: ERROR_STATUS_CODE.UNAUTHORIZED,
            severity: ERROR_SEVERITY.ERROR,
            callFunc: 'staff.invitation.query.checkEmailAvailability',
            code: 'NOT_FOUND',
            status: ERROR_STATUS_CODE.NOT_FOUND,
            details: { ...args },
          })
        }
  
        // メールアドレスが既に登録されているかチェック
        try {
          const userList = await clerk.users.getUserList({
            emailAddress: [args.email]
          });
  
          if (userList.data.length > 0) {
            throw new ConvexError({
              message: 'このメールアドレスは既に登録されています',
              statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
              severity: ERROR_SEVERITY.ERROR,
              callFunc: 'staff.invitation.query.checkEmailAvailability',
              code: 'BAD_REQUEST',
              status: ERROR_STATUS_CODE.BAD_REQUEST,
              details: { ...args },
            })
          }
        } catch (error) {
          console.error('Failed to check existing user:', error);
        }
  
        // 既存の招待もチェック
        const invitationList = await clerk.invitations.getInvitationList();
        const existingInvitation = invitationList.data.find(
          inv => inv.emailAddress === args.email && inv.status === 'pending'
        );
  
        if (existingInvitation) {
          throw new ConvexError({
            message: 'このメールアドレスは既に招待されています',
            statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
            severity: ERROR_SEVERITY.ERROR,
            callFunc: 'staff.invitation.query.checkEmailAvailability',
            code: 'BAD_REQUEST',
            status: ERROR_STATUS_CODE.BAD_REQUEST,
            details: { ...args },
          })
        }
        
        return {
          isAvailable: true,
        };
      } catch (error) {
        console.error('Failed to check email availability:', error);
        throw error;
      }
    },
  });