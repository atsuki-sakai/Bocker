import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants';
import { checkAuth } from '@/convex/utils/auth';
import { MAX_REFERRAL_COUNT } from '@/lib/constants';
import { validateStringLength } from '@/convex/utils/validations';

export const findByLastBonusInvoiceId = query({
  args: {
    last_bonus_invoice_id: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.query('tenant_referral').withIndex('by_last_bonus_invoice_archive', (q) => q.eq('last_bonus_invoice_id', args.last_bonus_invoice_id).eq('is_archive', false)).first();
  },
});
export const findReferralCodeByCustomerId = query({
  args: {
    stripe_customer_id: v.string(),
  },
  handler: async (ctx, args) => {
    validateStringLength(args.stripe_customer_id,'stripe_customer_id');
    const tenant = await ctx.db
      .query('tenant')
      .withIndex('by_stripe_customer_archive', (q) =>
        q.eq('stripe_customer_id', args.stripe_customer_id).eq('is_archive', false)
      )
      .first();

    if (!tenant) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.INTERNAL_SERVER_ERROR,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'tenant.referral.findReferralCodeByCustomerId',
        message: '指定されたStripe顧客IDに対応するテナントが存在しません',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          ...args,
        },
      });
    }

    const referral = await ctx.db
      .query('tenant_referral')
      .withIndex('by_tenant_archive', (q) => q.eq('tenant_id', tenant._id).eq('is_archive', false))
      .first();

    if (!referral) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'tenant.referral.findReferralCodeByCustomerId',
        message: '指定されたStripe顧客IDに対応するテナントが存在しません',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          ...args,
        },
      });
    }
    return referral;
  },
});


export const findByReferralCode = query({
  args: {
    referral_code: v.string(),
  },
  handler: async (ctx, args) => {
    validateStringLength(args.referral_code, 'referral_code');
    return await ctx.db
      .query('tenant_referral')
      .withIndex('by_referral_code_archive', (q) => q.eq('referral_code', args.referral_code).eq('is_archive', false))
      .first();
  },
});

export const findByTenantId = query({
  args: {
    tenant_id: v.id('tenant'),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('tenant_referral')
      .withIndex('by_tenant_archive', (q) => q.eq('tenant_id', args.tenant_id).eq('is_archive', false))
      .first();
  },
});

// 紹介数を指定して取得するためのAPI
export const getEmailsByReferralCount = query({
  args: {
    include_updated: v.boolean(), // 当月に更新されたデータを含むかどうか
    is_apply_max_use_referral: v.boolean(), // 上限値を超えたデータを含むかどうか
  },
  handler: async (ctx, args) => {
    console.info(
      'include_updated: 当月にクーポンを適用済みのデータを含むかどうか - true: 含む, false: 含めない',
      args.include_updated
    );
    console.info(
      'is_apply_max_use_referral: 紹介上限値を超えたデータを含むかどうか - true: 含む, false: 含めない',
      args.is_apply_max_use_referral
    );
    checkAuth(ctx, true);
    const batchSize = 100; // Process in smaller batches
    let allTenantEmails: string[] = [];
    let cursor = null;
    let hasMore = true;

    // 当月の開始日と終了日を計算
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startOfMonth = firstDayOfMonth.getTime();
    const endOfMonth = firstDayOfNextMonth.getTime() - 1;

    // まず、条件に合うすべてのreferralを取得
    while (hasMore) {
      let query = ctx.db
        .query('tenant_referral')
        .filter((q) =>
          q.and(
            q.gt(q.field('referral_point'), 0),
            q.eq(q.field('is_archive'), false)
          )
        );

      // totalReferralCountによる絞り込み（isApplyMaxUseReferralがtrueの場合は適用しない）
      if (!args.is_apply_max_use_referral) {
        query = query.filter((q) =>
          q.or(
            q.eq(q.field('total_referral_count'), null),
            q.lt(q.field('total_referral_count'), MAX_REFERRAL_COUNT)
          )
        );
      }

      // include_updatedフラグに基づいてフィルタリング
      if (!args.include_updated) {
        // 当月に更新されたデータを除外（当月のupdated_atを持つレコードを除外）
        query = query.filter((q) =>
          q.or(
            q.eq(q.field('updated_at'), null), // updatedAtがnullの場合は含める
            q.lt(q.field('updated_at'), startOfMonth), // 当月より前の更新
            q.gt(q.field('updated_at'), endOfMonth) // 当月より後の更新（将来の予約など）
          )
        );
      }
      // includeUpdatedがtrueの場合は、全てのレコードを取得（フィルタは不要）

      const batch = await query.paginate({ cursor, numItems: batchSize });
      console.debug(`取得したreferralレコード数: ${batch.page.length}`);

      if (batch.page.length > 0) {
        // データの検証（安全策として）
        const validReferrals = batch.page.filter(
          (referral) => typeof referral.referral_point === 'number' && referral.referral_point > 0
        );
        console.debug(`有効なreferralレコード数: ${validReferrals.length}/${batch.page.length}`);

        // 一度にすべてのtenantIdsを収集
        const tenantIds = validReferrals.map((referral) => referral.tenant_id);

        // tenantIdsを使って対応するテナントを一括で取得
        for (const tenantId of tenantIds) {
          const tenant = await ctx.db.get(tenantId);
          if (tenant && tenant.user_email && !tenant.is_archive) {
            allTenantEmails.push(tenant.user_email);
          }
        }
      }

      // Check if we need to continue
      hasMore = !batch.isDone;
      cursor = batch.continueCursor;

      // Safety check to avoid hitting read limits
      if (allTenantEmails.length > 500) break;
    }
    
    console.info(`最終取得メールアドレス数: ${allTenantEmails.length}`);
    
    return {
      include_updated: args.include_updated,
      is_apply_max_use_referral: args.is_apply_max_use_referral || false,
      max_referral_count: MAX_REFERRAL_COUNT,
      total: allTenantEmails.length,
      all_tenant_emails: allTenantEmails,
    };
  },
});