import { mutation } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { createRecord, updateRecord, excludeFields, archiveRecord, killRecord } from '@/convex/utils/helpers';
import { checkAuth } from '@/convex/utils/auth';
import { ConvexError } from 'convex/values';
import { ERROR_SEVERITY, ERROR_STATUS_CODE } from '@/lib/errors/constants';
import { validateNumberLength } from '@/convex/utils/validations';

// スタッフ詳細設定の追加
export const create = mutation({
  args: {
    tenant_id: v.id('tenant'),
    staff_id: v.id('staff'),
    org_id: v.id('organization'),
    extra_charge: v.optional(v.number()),
    priority: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateNumberLength(args.extra_charge, 'extra_charge');
    validateNumberLength(args.priority, 'priority');
    // スタッフの存在確認
    const staff = await ctx.db.get(args.staff_id);
    if (!staff) {
      throw new ConvexError({
        message: '指定されたスタッフが存在しません',
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'staff.config.create',
        details: { ...args },
      });
    }

    // 組織の存在確認
    const org = await ctx.db.get(args.org_id);
    if (!org) {
      throw new ConvexError({
        message: '指定された組織が存在しません',
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'staff.config.create',
        details: { ...args },
      });
    }

    return await createRecord(ctx, 'staff_config', args);
  },
});

// スタッフ設定情報の更新
export const update = mutation({
  args: {
    staff_config_id: v.id('staff_config'),
    extra_charge: v.optional(v.number()),
    priority: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateNumberLength(args.extra_charge, 'extra_charge');
    validateNumberLength(args.priority, 'priority');
    // スタッフ設定の存在確認
    const staffConfig = await ctx.db.get(args.staff_config_id);
    if (!staffConfig || staffConfig.is_archive) {
      throw new ConvexError({
        message: '指定されたスタッフ設定が存在しません',
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'staff.config.update',
        details: { ...args },
      });
    }

    const updateData = excludeFields(args, ['staff_config_id']);

    return await updateRecord(ctx, args.staff_config_id, updateData);
  },
});

// スタッフ設定の削除
export const archive = mutation({
  args: {
    staff_config_id: v.id('staff_config'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    return await archiveRecord(ctx, args.staff_config_id);
  },
});

export const upsert = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    staff_config_id: v.id('staff_config'),
    staff_id: v.id('staff'),
    extra_charge: v.optional(v.number()),
    priority: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateNumberLength(args.extra_charge, 'extra_charge');
    validateNumberLength(args.priority, 'priority');
    const existingStaffConfig = await ctx.db.get(args.staff_config_id);
    if (!existingStaffConfig || existingStaffConfig.is_archive) {
      return await ctx.db.insert('staff_config', {
        ...args,
        is_archive: false,
      });
    } else {
      const updateData = excludeFields(args, ['staff_config_id', 'staff_id', 'tenant_id', 'org_id']);
      return await updateRecord(ctx, existingStaffConfig._id, updateData);
    }
  },
});

export const kill = mutation({
  args: {
    staff_config_id: v.id('staff_config'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    return await killRecord(ctx, args.staff_config_id);
  },
});
