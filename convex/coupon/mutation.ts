import { mutation } from '../_generated/server';
import { v } from 'convex/values';
import { activeCustomerType, couponDiscountType } from '../types';
import { checkAuth } from '../utils/auth';
import { validateNumberLength, validateStringLength } from '../utils/validations';
import { createRecord, killRecord, updateRecord } from '../utils/helpers';
import { ConvexError } from 'convex/values';
import { ERROR_SEVERITY, ERROR_STATUS_CODE } from '@/lib/errors/constants';
import { Doc, Id } from '../_generated/dataModel';

/**
 * バリデーションラッパー: undefinedはスキップ、他は実行
 */
function safeValidateNumberLength(val: any, msg: string) {
  if (val !== undefined) validateNumberLength(val, msg);
}

export const create = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    coupon_uid: v.string(),
    name: v.string(),
    discount_type: couponDiscountType,
    percentage_discount_value: v.optional(v.number()),
    fixed_discount_value: v.optional(v.number()),
    is_active: v.boolean(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateStringLength(args.name,"クーポン名は255文字以下で入力してください");
    validateStringLength(args.coupon_uid,"クーポンUIDは255文字以下で入力してください");
    return await createRecord(ctx, 'coupon', args);
  },
});

export const update = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    coupon_uid: v.string(),
    name: v.string(),
    discount_type: couponDiscountType,
    percentage_discount_value: v.optional(v.number()),
    fixed_discount_value: v.optional(v.number()),
    is_active: v.boolean(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateStringLength(args.name,"クーポン名は255文字以下で入力してください");
    validateStringLength(args.coupon_uid,"クーポンUIDは255文字以下で入力してください");

    const coupon = await ctx.db.query('coupon').withIndex('by_tenant_org_coupon_uid_archive', (q) =>
      q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('coupon_uid', args.coupon_uid)
    ).first();
    if (!coupon) {
      throw new ConvexError(
        {
          message: "クーポンが見つかりません",
          statusCode: ERROR_STATUS_CODE.NOT_FOUND,
          severity: ERROR_SEVERITY.ERROR,
          code: "COUPON_NOT_FOUND",
          details: {
            ...args,
          }
        }
      );
    }
    return await updateRecord(ctx, coupon._id, args);
  },
});

export const updateCouponRelatedTables = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    coupon_id: v.id('coupon'),
    coupon_uid: v.string(),
    name: v.string(),
    discount_type: couponDiscountType,
    percentage_discount_value: v.optional(v.number()),
    fixed_discount_value: v.optional(v.number()),
    is_active: v.optional(v.boolean()),
    start_date_unix: v.optional(v.number()),
    end_date_unix: v.optional(v.number()),
    max_use_count: v.optional(v.number()),
    number_of_use: v.optional(v.number()),
    active_customer_type: activeCustomerType,
    selected_menu_ids: v.optional(v.array(v.id('menu'))),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateStringLength(args.name,"クーポン名は255文字以下で入力してください");
    validateStringLength(args.coupon_uid,"クーポンUIDは255文字以下で入力してください");
    safeValidateNumberLength(args.max_use_count, "最大利用回数は1000000000以下で入力してください");
    safeValidateNumberLength(args.number_of_use, "利用回数は1000000000以下で入力してください");
    safeValidateNumberLength(args.percentage_discount_value, "割引率は100以下で入力してください");
    safeValidateNumberLength(args.fixed_discount_value, "割引額は1000000000以下で入力してください");
    safeValidateNumberLength(args.start_date_unix, "開始日は1000000000以下で入力してください");
    safeValidateNumberLength(args.end_date_unix, "終了日は1000000000以下で入力してください");

    const coupon = await ctx.db.get(args.coupon_id);
    if (!coupon) {
      throw new ConvexError(
        {
          message: "クーポンが見つかりません",
          statusCode: ERROR_STATUS_CODE.NOT_FOUND,
          severity: ERROR_SEVERITY.ERROR,
          code: "COUPON_NOT_FOUND",
          details: {
            ...args,
          }
        }
      );
    }
    await updateRecord(ctx, coupon._id, {
      coupon_uid: args.coupon_uid, // クーポンUID
      name: args.name, // クーポン名
      discount_type: args.discount_type, // 割引タイプ
      percentage_discount_value: args.percentage_discount_value, // 割引率
      fixed_discount_value: args.fixed_discount_value, // 割引額
      is_active: args.is_active, // 有効/無効
    });

    const couponConfig = await ctx.db.query('coupon_config').withIndex('by_tenant_org_coupon_archive', (q) =>
      q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('coupon_id', coupon._id)
    ).first();
  
    if (!couponConfig) {
      throw new ConvexError(
        {
          message: "クーポン設定が見つかりません",
          statusCode: ERROR_STATUS_CODE.NOT_FOUND,
          severity: ERROR_SEVERITY.ERROR,
          code: "COUPON_CONFIG_NOT_FOUND",
          details: {
            ...args,
          }
        }
      );
    }

    await updateRecord(ctx, couponConfig._id, {
      start_date_unix: args.start_date_unix,
      end_date_unix: args.end_date_unix,
      max_use_count: args.max_use_count,
      number_of_use: args.number_of_use,
      active_customer_type: args.active_customer_type,
    });
    return coupon._id;
  },
});

export const createCouponRelatedTables = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    coupon_uid: v.string(),
    name: v.string(),
    discount_type: couponDiscountType,
    percentage_discount_value: v.optional(v.number()),
    fixed_discount_value: v.optional(v.number()),
    is_active: v.optional(v.boolean()),
    start_date_unix: v.optional(v.number()),
    end_date_unix: v.optional(v.number()),
    max_use_count: v.optional(v.number()),
    number_of_use: v.optional(v.number()),
    active_customer_type: activeCustomerType,
    selected_menu_ids: v.optional(v.array(v.id('menu'))),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateStringLength(args.name,"クーポン名は255文字以下で入力してください");
    validateStringLength(args.coupon_uid,"クーポンUIDは255文字以下で入力してください");
    safeValidateNumberLength(args.max_use_count, "最大利用回数は1000000000以下で入力してください");
    safeValidateNumberLength(args.number_of_use, "利用回数は1000000000以下で入力してください");
    safeValidateNumberLength(args.percentage_discount_value, "割引率は100以下で入力してください");
    safeValidateNumberLength(args.fixed_discount_value, "割引額は1000000000以下で入力してください");
    safeValidateNumberLength(args.start_date_unix, "開始日は1000000000以下で入力してください");
    safeValidateNumberLength(args.end_date_unix, "終了日は1000000000以下で入力してください");

    const couponId = await createRecord(ctx, 'coupon', {
      tenant_id: args.tenant_id,
      org_id: args.org_id,
      coupon_uid: args.coupon_uid, // クーポンUID
      name: args.name, // クーポン名
      discount_type: args.discount_type, // 割引タイプ
      percentage_discount_value: args.percentage_discount_value, // 割引率
      fixed_discount_value: args.fixed_discount_value, // 割引額
      is_active: args.is_active ?? true, // 有効/無効
    });

    const couponConfig = await createRecord(ctx, 'coupon_config', {
      tenant_id: args.tenant_id, // テナントID
      org_id: args.org_id, // 店舗ID
      coupon_id: couponId, // クーポンID
      start_date_unix: args.start_date_unix, // 開始日時
      end_date_unix: args.end_date_unix, // 終了日時
      max_use_count: args.max_use_count, // 最大利用回数
      number_of_use: args.number_of_use, // 利用回数
      active_customer_type: args.active_customer_type, // 適用対象(初回/リピート/全て)
    });

    return couponId;
  },
});

export const killRelatedTables = mutation({
  args: {
    couponId: v.id('coupon'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    
    const coupon = await ctx.db.get(args.couponId);
    if (!coupon) {
      console.log("クーポンが見つかりません、すでに削除されています。");
      return;
    }
    await killRecord(ctx, coupon._id);
    const couponConfig = await ctx.db.query('coupon_config').withIndex('by_tenant_org_coupon_archive', (q) =>
      q.eq('tenant_id', coupon.tenant_id).eq('org_id', coupon.org_id).eq('coupon_id', coupon._id)
    ).first();
    if (couponConfig) {
      await killRecord(ctx, couponConfig._id);
    }
    const couponExclusionMenu = await ctx.db.query('coupon_exclusion_menu').withIndex('by_tenant_org_coupon_menu_archive', (q) =>
      q.eq('tenant_id', coupon.tenant_id).eq('org_id', coupon.org_id).eq('coupon_id', coupon._id)
    ).collect();
    if (couponExclusionMenu.length > 0) {
      await Promise.all(couponExclusionMenu.map(async (item) => {
        await killRecord(ctx, item._id);
      }));
    }
    return true;
  },
});
