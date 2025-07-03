import { mutation, internalMutation } from '../_generated/server';
import { v } from 'convex/values';
import { activeCustomerType, couponDiscountType } from '../types';
import { checkAuth } from '../utils/auth';
import { validateNumberLength, validateStringLength } from '../utils/validations';
import { createRecord, killRecord, updateRecord } from '../utils/helpers';
import { ConvexError } from 'convex/values';
import { ERROR_SEVERITY, ERROR_STATUS_CODE } from '@/lib/errors/constants';
import { getPlanLimits } from '../utils/helpers';
import { SubscriptionPlanName, subscriptionPlanNameType } from '../types';

/**
 * バリデーションラッパー: undefinedはスキップ、他は実行
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeValidateNumberLength(val: any, msg: string) {
  if (val !== undefined) validateNumberLength(val, msg);
}

export const create = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    plan_name: subscriptionPlanNameType,
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

    const limits = getPlanLimits(args.plan_name as SubscriptionPlanName);

    // 3. 現在のメニュー数を取得
    // メニュー数を取得するために、最大数+1件取得して、その数をチェックする無駄なデータの取得をしない
    const couponCount = await ctx.db
      .query('coupon')
      .withIndex('by_tenant_org_archive', (q) =>
        q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id)
      ).filter((q) => q.eq(q.field('is_archive'), false))
      .take(limits.maxCouponCount + 1);

    // 4. 上限チェック
    if (couponCount.length >= limits.maxCouponCount) {
      // 2 . ConvexError を使用してエラーをスローする
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'menu.core.create',
        message: `${args.plan_name}プランのクーポンの最大登録数は${limits.maxCouponCount}件です。`,
        code: 'BAD_REQUEST',
      });
    }
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
    plan_name: subscriptionPlanNameType,
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

    const limits = getPlanLimits(args.plan_name as SubscriptionPlanName);

    // 3. 現在のメニュー数を取得
    // メニュー数を取得するために、最大数+1件取得して、その数をチェックする無駄なデータの取得をしない
    const optionCount = await ctx.db
      .query('option')
      .withIndex('by_tenant_org_active_archive', (q) =>
        q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id)
      ).filter((q) => q.eq(q.field('is_archive'), false))
      .take(limits.maxMenuCount + 1);

    // 4. 上限チェック
    if (optionCount.length >= limits.maxOptionCount) {
      // 2 . ConvexError を使用してエラーをスローする
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'menu.core.create',
        message: `${args.plan_name}プランのメニューの最大登録数は${limits.maxMenuCount}件です。`,
        code: 'BAD_REQUEST',
      });
    }

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

    await createRecord(ctx, 'coupon_config', {
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

// クーポン使用回数をインクリメントする内部ミューテーション
export const incrementUsageCount = internalMutation({
  args: {
    couponId: v.id('coupon'),
  },
  handler: async (ctx, args) => {
    const coupon = await ctx.db.get(args.couponId);
    if (!coupon) {
      throw new ConvexError({
        message: 'クーポンが見つかりません',
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        code: 'COUPON_NOT_FOUND',
        details: { couponId: args.couponId },
      });
    }

    // coupon_configを取得
    const couponConfig = await ctx.db.query('coupon_config')
      .withIndex('by_tenant_org_coupon_archive', (q) =>
        q.eq('tenant_id', coupon.tenant_id)
          .eq('org_id', coupon.org_id)
          .eq('coupon_id', args.couponId)
          .eq('is_archive', false)
      )
      .first();

    if (!couponConfig) {
      throw new ConvexError({
        message: 'クーポン設定が見つかりません',
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        code: 'COUPON_CONFIG_NOT_FOUND',
        details: { couponId: args.couponId },
      });
    }

    // 使用回数をインクリメント
    await ctx.db.patch(couponConfig._id, {
      number_of_use: (couponConfig.number_of_use || 0) + 1,
      updated_at: Date.now(),
    });

    return true;
  },
});

// クーポン使用回数をデクリメントする内部ミューテーション（キャンセル時用）
export const decrementUsageCount = internalMutation({
  args: {
    couponId: v.id('coupon'),
  },
  handler: async (ctx, args) => {
    const coupon = await ctx.db.get(args.couponId);
    if (!coupon) {
      throw new ConvexError({
        message: 'クーポンが見つかりません',
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        code: 'COUPON_NOT_FOUND',
        details: { couponId: args.couponId },
      });
    }

    // coupon_configを取得
    const couponConfig = await ctx.db.query('coupon_config')
      .withIndex('by_tenant_org_coupon_archive', (q) =>
        q.eq('tenant_id', coupon.tenant_id)
          .eq('org_id', coupon.org_id)
          .eq('coupon_id', args.couponId)
          .eq('is_archive', false)
      )
      .first();

    if (!couponConfig) {
      throw new ConvexError({
        message: 'クーポン設定が見つかりません',
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        code: 'COUPON_CONFIG_NOT_FOUND',
        details: { couponId: args.couponId },
      });
    }

    // 使用回数をデクリメント（0未満にはしない）
    const currentCount = couponConfig.number_of_use || 0;
    if (currentCount > 0) {
      await ctx.db.patch(couponConfig._id, {
        number_of_use: currentCount - 1,
        updated_at: Date.now(),
      });
    }

    return true;
  },
});


// クーポン使用回数をバランスする内部ミューテーション
export const balanceUsageCount = internalMutation({
  args: {
    couponId: v.id('coupon'),
    balance: v.number(),
    type: v.union(v.literal('plus'), v.literal('minus')),
  },
  handler: async (ctx, args) => {
    const coupon = await ctx.db.get(args.couponId);
    if (!coupon) {
      throw new ConvexError({
        message: 'クーポンが見つかりません',
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        code: 'COUPON_NOT_FOUND',
        details: { couponId: args.couponId },
      });
    }

    // coupon_configを取得
    const couponConfig = await ctx.db.query('coupon_config')
      .withIndex('by_tenant_org_coupon_archive', (q) =>
        q.eq('tenant_id', coupon.tenant_id)
          .eq('org_id', coupon.org_id)
          .eq('coupon_id', args.couponId)
          .eq('is_archive', false)
      )
      .first();

    if (!couponConfig) {
      throw new ConvexError({
        message: 'クーポン設定が見つかりません',
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        code: 'COUPON_CONFIG_NOT_FOUND',
        details: { couponId: args.couponId },
      });
    }

    // 使用回数を更新（マイナスになる場合は0にする）
    const newUsageCount = args.type === 'plus' 
      ? (couponConfig.number_of_use || 0) + args.balance 
      : Math.max(0, (couponConfig.number_of_use || 0) - args.balance);
    
    await ctx.db.patch(couponConfig._id, {
      number_of_use: newUsageCount,
      updated_at: Date.now(),
    });

    return true;
  },
});