import { mutation } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { checkAuth } from '@/convex/utils/auth';
import { createRecord, updateRecord, archiveRecord } from '../utils/helpers';
import { ConvexError } from 'convex/values';
import { ERROR_SEVERITY, ERROR_STATUS_CODE } from '@/lib/errors/constants';

export const create = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    point_config_id: v.id('point_config'),
    is_active: v.optional(v.boolean()), // 有効/無効フラグ
    is_fixed_point: v.optional(v.boolean()), // 固定ポイントかどうか
    point_rate: v.optional(v.number()), // ポイント付与率  利用金額に対しての付与率 (例: 0.1なら10%)
    fixed_point: v.optional(v.number()), // 固定ポイント (例: 100円につき1ポイント)
    point_expiration_days: v.optional(v.number()), // ポイントの有効期限(日)
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    return await createRecord(ctx, 'point_config', args);
  },
});

export const update = mutation({
  args: {
    id: v.id('point_config'),
    is_active: v.optional(v.boolean()), // 有効/無効フラグ
    is_fixed_point: v.optional(v.boolean()), // 固定ポイントかどうか
    point_rate: v.optional(v.number()), // ポイント付与率  利用金額に対しての付与率 (例: 0.1なら10%)
    fixed_point: v.optional(v.number()), // 固定ポイント (例: 100円につき1ポイント)
    point_expiration_days: v.optional(v.number()), // ポイントの有効期限(日)
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'point.mutation.update',
        message: 'ポイント設定が見つかりませんでした。',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          ...args,
        },
      });
    }

    return await updateRecord(ctx, args.id, {
      is_active: args.is_active,
      is_fixed_point: args.is_fixed_point,
      point_rate: args.point_rate,
      fixed_point: args.fixed_point,
      point_expiration_days: args.point_expiration_days,
    });
  },
})

export const upsert = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    point_config_id: v.optional(v.id('point_config')),
    is_active: v.optional(v.boolean()), // 有効/無効フラグ
    is_fixed_point: v.optional(v.boolean()), // 固定ポイントかどうか
    point_rate: v.optional(v.number()), // ポイント付与率  利用金額に対しての付与率 (例: 0.1なら10%)
    fixed_point: v.optional(v.number()), // 固定ポイント (例: 100円につき1ポイント)
    point_expiration_days: v.optional(v.number()), // ポイントの有効期限(日)
  },
  returns: v.id('point_config'),
  handler: async (ctx, args) => {
    checkAuth(ctx);
    
    if (args.point_config_id) {
      const existing = await ctx.db.get(args.point_config_id);
      if (!existing) {
        throw new ConvexError({
          statusCode: ERROR_STATUS_CODE.NOT_FOUND,
          severity: ERROR_SEVERITY.ERROR,
          callFunc: 'point.mutation.upsert',
          message: 'ポイント設定が見つかりませんでした。',
          code: 'NOT_FOUND',
          status: 404,
          details: {
            ...args,
          },
        });
      }
      return await updateRecord(ctx, existing._id, {
        is_active: args.is_active,
        is_fixed_point: args.is_fixed_point,
        point_rate: args.point_rate,
        fixed_point: args.fixed_point,
        point_expiration_days: args.point_expiration_days,
      });
    } else {
      return await createRecord(ctx, 'point_config', {
        tenant_id: args.tenant_id,
        org_id: args.org_id,
        is_active: args.is_active,
        is_fixed_point: args.is_fixed_point,
        point_rate: args.point_rate,
        fixed_point: args.fixed_point,
        point_expiration_days: args.point_expiration_days,
      });
    }


  },
});
