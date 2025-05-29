
import { mutation } from '../../_generated/server';
import { v } from 'convex/values';
import { checkAuth } from '@/convex/utils/auth';
import { createRecord, updateRecord } from '@/convex/utils/helpers';
import { activeCustomerType } from '@/convex/types';
import { ConvexError} from 'convex/values';
import { ERROR_SEVERITY, ERROR_STATUS_CODE } from '@/lib/errors/constants';

export const create = mutation({
  args: {
    tenant_id: v.id('tenant'), // テナントID
    org_id: v.id('organization'), // 店舗ID
    coupon_id: v.id('coupon'), // クーポンID
    start_date_unix: v.optional(v.number()), // 開始日時
    end_date_unix: v.optional(v.number()), // 終了日時
    max_use_count: v.optional(v.number()), // 最大利用回数
    number_of_use: v.optional(v.number()), // 利用回数
    active_customer_type: activeCustomerType,
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    return await createRecord(ctx, 'coupon_config', args);
  },
});

export const update = mutation({
  args: {
    tenant_id: v.id('tenant'), // テナントID
    org_id: v.id('organization'), // 店舗ID
    coupon_id: v.id('coupon'), // クーポンID
    start_date_unix: v.optional(v.number()), // 開始日時
    end_date_unix: v.optional(v.number()), // 終了日時
    max_use_count: v.optional(v.number()), // 最大利用回数
    number_of_use: v.optional(v.number()), // 利用回数
    active_customer_type: v.optional(activeCustomerType),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    const couponConfig = await ctx.db.query('coupon_config').withIndex('by_tenant_org_coupon_archive', (q) => q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('coupon_id', args.coupon_id)).first();
    if(!couponConfig) {
      throw new ConvexError({
        severity: ERROR_SEVERITY.ERROR,
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        message: 'クーポン設定が見つかりません',
        code: 'COUPON_CONFIG_NOT_FOUND',
        details: {
          tenant_id: args.tenant_id,
          org_id: args.org_id,
          coupon_id: args.coupon_id,
        },
      });
    }
    return await updateRecord(ctx,couponConfig._id, args);
  },
});

