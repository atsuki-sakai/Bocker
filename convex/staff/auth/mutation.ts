import { mutation } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { createRecord, updateRecord, excludeFields, archiveRecord, killRecord } from '@/convex/utils/helpers';
import { validateRequired } from '@/convex/utils/validations';
import { roleType } from '@/convex/types';
import { checkAuth } from '@/convex/utils/auth';
import { ConvexError } from 'convex/values';
import { ERROR_SEVERITY, ERROR_STATUS_CODE } from '@/lib/errors/constants';

// スタッフ認証の追加
export const create = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    staff_id: v.id('staff'),
    role: roleType,
    pin_code: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    // スタッフ認証の存在確認
    const staffAuth = await ctx.db
      .query('staff_auth')
      .withIndex('by_tenant_org_staff_archive', (q) => q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('staff_id', args.staff_id))
      .first();
    if (staffAuth) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'staff.auth.create',
        message: '指定されたスタッフ認証が存在します',
        code: 'NOT_FOUND',
        status: ERROR_STATUS_CODE.NOT_FOUND,
        details: {
          ...args,
        },
      });
    }
    return await createRecord(ctx, 'staff_auth', args);
  },
});

// スタッフ認証情報の更新
export const update = mutation({
  args: {
    staff_auth_id: v.id('staff_auth'),
    role: v.optional(roleType),
    pin_code: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.staff_auth_id, 'staff_auth_id');
    // スタッフ認証の存在確認
    const staffAuth = await ctx.db.get(args.staff_auth_id);
    if (!staffAuth || staffAuth.is_archive) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'staff.auth.update',
        message: '指定されたスタッフ認証が存在しません',
        code: 'NOT_FOUND',
        status: ERROR_STATUS_CODE.NOT_FOUND,
        details: {
          ...args,
        },
      });
    }

    const updateData = excludeFields(args, ['staff_auth_id']);

    return await updateRecord(ctx,args.staff_auth_id, updateData);
  },
});

// スタッフ認証の削除
export const archive = mutation({
  args: {
    staff_auth_id: v.id('staff_auth'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.staff_auth_id, 'staff_auth_id');
    return await archiveRecord(ctx, args.staff_auth_id);
  },
});

export const upsert = mutation({
  args: {
    staff_auth_id: v.optional(v.id('staff_auth')),
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    staff_id: v.id('staff'),
    role: roleType,
    pin_code: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    if (!args.staff_auth_id) {
      return await createRecord(ctx, 'staff_auth', {
        ...args
      });
    }else{
      const existingStaffAuth = await ctx.db.get(args.staff_auth_id);

      if (!existingStaffAuth || existingStaffAuth.is_archive) {
        const updateData = excludeFields(args, ['staff_auth_id']);
        return await createRecord(ctx, 'staff_auth', updateData);
      } else {
        const updateData = excludeFields(args, ['staff_auth_id', 'staff_id']);
        return await updateRecord(ctx, existingStaffAuth._id, updateData);
      }
    }
  },
});

export const kill = mutation({
  args: {
    staff_auth_id: v.id('staff_auth'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.staff_auth_id, 'staff_auth_id');
    return await killRecord(ctx, args.staff_auth_id);
  },
});
