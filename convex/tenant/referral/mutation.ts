import { v } from 'convex/values';
import { mutation } from '@/convex/_generated/server';
import { generateReferralCode } from '@/lib/utils';
import { validateStringLength, validateDateStrFormat } from '@/convex/utils/validations';
import { ConvexError } from 'convex/values';
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants';
import { updateRecord, createRecord } from '@/convex/utils/helpers';

/**
 * テナント紹介プログラムミューテーションAPI
 * 
 * テナントの紹介プログラムを作成するためのミューテーションエンドポイントを提供します。
 * サービス層を利用して、データアクセスとビジネスロジックを分離します。
 */

export const create = mutation({
  args: {
    tenant_id: v.id('tenant')
  },
  handler: async (ctx, args) => {
    const referralCode = generateReferralCode();
    const tenantReferralId = await createRecord(ctx, 'tenant_referral', {
      tenant_id: args.tenant_id,
      referral_code: referralCode,
      referral_point: 0,
      total_referral_count: 0
    });
    return tenantReferralId;
  },
});



/**
 * 紹介カウント増加（冪等性対応版）
 * 同一のイベントIDによる重複実行を防止
 */
export const incrementReferralCount = mutation({
  args: {
    referral_id: v.id('tenant_referral'),
    idempotency_key: v.optional(v.string()), // Stripeイベントid等、重複防止用キー
    last_processed_event_id:v.string(), // 最後に処理したStripeイベントID（冪等性用）
    last_processed_key: v.string(), // 最後に処理した複合キー (event_id + role)
    last_discount_transaction_id: v.string(), // 最後の割引処理のトランザクションID（冪等性用）
    last_discount_applied_month: v.string(), // 最後に割引を適用した月（YYYY-MM形式、冪等性用）
  },
  handler: async (ctx, args) => {
    const referral = await ctx.db.get(args.referral_id);
    validateDateStrFormat(args.last_discount_applied_month, 'last_discount_applied_month');
    if (!referral) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'tenant.referral.incrementReferralCount',
        message: '指定されたテナントの招待プログラムが存在しません',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          ...args,
        },
      });
    }

    // 冪等性対応: idempotency_keyが提供されている場合は重複チェック
    if (args.idempotency_key) {
      // idempotency_keyをlast_processed_event_idのようなフィールドで記録・チェック
      if (referral.last_processed_event_id === args.idempotency_key && referral.last_processed_key === args.last_processed_key) {
        console.log(`紹介カウント増加: 既に処理済みのイベントです（冪等性により成功扱い）: ${args.idempotency_key}`);
        return {
          success: true,
          alreadyProcessed: true,
          referral_point: referral.referral_point,
          total_referral_count: referral.total_referral_count,
          last_processed_event_id: referral.last_processed_event_id || args.idempotency_key,
          last_discount_transaction_id: referral.last_discount_transaction_id,
          last_discount_applied_month: referral.last_discount_applied_month,
        };
      }
    }

    // 紹介カウントを増加
    const newReferralPoint = referral.referral_point ? referral.referral_point + 1 : 1;
    const newTotalReferralCount = referral.total_referral_count ? referral.total_referral_count + 1 : 1;

    await updateRecord(ctx, args.referral_id, {
      referral_point: newReferralPoint,
      total_referral_count: newTotalReferralCount,
      last_processed_event_id: args.idempotency_key, // 処理済みイベントIDを記録
      last_discount_transaction_id: args.last_discount_transaction_id,
      last_discount_applied_month: args.last_discount_applied_month,
    });

    console.log(`紹介カウント増加完了: referral_id=${args.referral_id}, new_point=${newReferralPoint}, event_id=${args.idempotency_key}`);

    return {
      success: true,
      alreadyProcessed: false,
      referral_point: newReferralPoint,
      total_referral_count: newTotalReferralCount,
    };
  },
});

/**
 * 紹介数を減らす（冪等性対応版）
 * 割引適用処理での重複実行を防止
 */
export const decreaseBalanceReferralCount = mutation({
  args: {
    user_email: v.string(),
    transaction_id: v.optional(v.string()), // 冪等性確保用のトランザクションID
    applied_month: v.optional(v.string()),  // 適用月（YYYY-MM形式）
  },
  handler: async (ctx, args) => {
    validateStringLength(args.user_email, 'user_email');
    
    // テナントを取得
    const tenant = await ctx.db
      .query('tenant')
      .withIndex('by_user_email_archive', (q) => q.eq('user_email', args.user_email).eq('is_archive', false))
      .first();

    // 冪等性対応: テナントが見つからない場合もエラーではなく成功として扱う
    if (!tenant) {
      console.log(`紹介数減算処理: テナントが見つかりません（冪等性により成功扱い）: ${args.user_email}`);
      return { 
        success: true, 
        alreadyProcessed: true,
        message: 'テナントが既に削除済みまたは存在しません' 
      };
    }

    const referral = await ctx.db
      .query('tenant_referral')
      .withIndex('by_tenant_archive', (q) => q.eq('tenant_id', tenant._id).eq('is_archive', false))
      .first();

    // 冪等性対応: 招待プログラムが見つからない場合もエラーではなく成功として扱う
    if (!referral) {
      console.log(`紹介数減算処理: 招待プログラムが見つかりません（冪等性により成功扱い）: ${args.user_email}`);
      return { 
        success: true, 
        alreadyProcessed: true,
        message: '招待プログラムが既に削除済みまたは存在しません' 
      };
    }

    // 冪等性チェック: 同一トランザクションIDまたは同一月での重複実行を防止
    if (args.transaction_id && referral.last_discount_transaction_id === args.transaction_id) {
      console.log(`紹介数減算処理: 既に処理済みのトランザクションです（冪等性により成功扱い）: ${args.transaction_id}`);
      return { 
        success: true, 
        alreadyProcessed: true,
        referral_point: referral.referral_point,
        message: '既に処理済みのトランザクションです' 
      };
    }

    if (args.applied_month && referral.last_discount_applied_month === args.applied_month) {
      console.log(`紹介数減算処理: 同一月で既に処理済みです（冪等性により成功扱い）: ${args.applied_month}`);
      return { 
        success: true, 
        alreadyProcessed: true,
        referral_point: referral.referral_point,
        message: '同一月で既に処理済みです' 
      };
    }

    // 紹介ポイントが0以下の場合は冪等性により成功扱い
    if (!referral.referral_point || referral.referral_point <= 0) {
      console.log(`紹介数減算処理: 紹介ポイントが0以下です（冪等性により成功扱い）: ${args.user_email}`);
      return { 
        success: true, 
        alreadyProcessed: true,
        referral_point: 0,
        message: '紹介ポイントが既に0以下です' 
      };
    }

    // 紹介数を減算
    const newReferralPoint = Math.max(0, referral.referral_point - 1);

    await updateRecord(ctx, referral._id, {
      referral_point: newReferralPoint,
      last_discount_applied_month: args.applied_month,
      last_discount_transaction_id: args.transaction_id,
    });

    console.log(`紹介数減算完了: user_email=${args.user_email}, new_point=${newReferralPoint}, transaction_id=${args.transaction_id}`);

    return { 
      success: true, 
      alreadyProcessed: false,
      referral_point: newReferralPoint,
      message: '紹介数減算が完了しました' 
    };
  },
});
