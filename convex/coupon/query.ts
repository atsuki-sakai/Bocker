import { query } from '../_generated/server';
import { v } from 'convex/values';
import { checkAuth } from '../utils/auth';
import { paginationOptsValidator } from 'convex/server';
import { ConvexError } from 'convex/values';
import { ERROR_SEVERITY, ERROR_STATUS_CODE } from '@/lib/errors/constants';

export const list = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    paginationOpts: paginationOptsValidator,
    include_archive: v.optional(v.boolean()),
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    return await ctx.db.query('coupon').withIndex('by_tenant_org_archive', (q) =>
      q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id)
    ).paginate(args.paginationOpts);
  },
});

export const findByCouponUid = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    coupon_uid: v.string(),
    active_only: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true);
    return await ctx.db.query('coupon').withIndex('by_tenant_org_coupon_uid_archive', (q) =>
      q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('coupon_uid', args.coupon_uid)
    ).first();
  },
});

export const findById = query({
  args: {
    coupon_id: v.id('coupon'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    return await ctx.db.get(args.coupon_id);
  },
});


export const getCouponRelatedTablesAndExclusionMenus = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    coupon_id: v.id('coupon'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);

    const coupon = await ctx.db.get(args.coupon_id);
    if (!coupon) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'coupon.query.getCouponRelatedTables',
        message: 'クーポンが見つかりませんでした。',
        code: 'NOT_FOUND',
        status: ERROR_STATUS_CODE.NOT_FOUND,
        details: {
          ...args,
        },
      });
    }

    const couponConfig = await ctx.db.query('coupon_config').withIndex('by_tenant_org_coupon_archive', (q) =>
      q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('coupon_id', args.coupon_id)
    ).first();

    if (!couponConfig) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'coupon.query.getCouponRelatedTables',
        message: 'クーポンの設定が見つかりませんでした。',
        code: 'NOT_FOUND',
        status: ERROR_STATUS_CODE.NOT_FOUND,
        details: {
          ...args,
        },
      });
    }

    const exclusionMenus = await ctx.db.query('coupon_exclusion_menu').withIndex('by_tenant_org_coupon_menu_archive', (q) =>
      q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('coupon_id', args.coupon_id)
    ).collect();

    return {
      coupon,
      couponConfig,
      exclusionMenus,
    };
  },
});