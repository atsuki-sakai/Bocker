import { mutation, internalMutation } from '@/convex/_generated/server';
import type { Id, TableNames } from '@/convex/_generated/dataModel';
import { v } from 'convex/values';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { validateRequired } from '@/services/convex/shared/utils/validation';
import { internal } from '@/convex/_generated/api';

// サロンの紹介数を減らすためのAPI
export const decreaseBalanceReferralCount = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true);
    validateRequired(args.email, 'email');
    const salon = await ctx.db
      .query('salon')
      .withIndex('by_email', (q) => q.eq('email', args.email).eq('isArchive', false))
      .first();
    if (!salon) {
      throw new Error('Salon not found');
    }

    const referral = await ctx.db
      .query('salon_referral')
      .withIndex('by_salon_id', (q) =>
        q.eq('salonId', salon?._id as Id<'salon'>).eq('isArchive', false)
      )
      .first();
    if (!referral) {
      throw new Error('Referral not found');
    }

    await ctx.db.patch(referral._id, {
      referralCount: referral.referralCount ? referral.referralCount - 1 : 0,
      updatedAt: Date.now(),
    });

    return true;
  },
});

// サロンの紹介数を０にするためのAPI
export const resetReferralCount = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true);

    const salon = await ctx.db
      .query('salon')
      .withIndex('by_email', (q) => q.eq('email', args.email).eq('isArchive', false))
      .first();
    if (!salon) {
      throw new Error('Salon not found');
    }

    const referral = await ctx.db
      .query('salon_referral')
      .withIndex('by_salon_id', (q) =>
        q.eq('salonId', salon?._id as Id<'salon'>).eq('isArchive', false)
      )
      .first();
    if (!referral) {
      throw new Error('Referral not found');
    }

    await ctx.db.patch(referral._id, {
      referralCount: 0,
    });

    return true;
  },
});

// 紹介数を指定して更新するためのAPI
export const balanceReferralCount = mutation({
  args: {
    email: v.string(),
    newReferralCount: v.number(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true);
    const salon = await ctx.db
      .query('salon')
      .withIndex('by_email', (q) => q.eq('email', args.email).eq('isArchive', false))
      .first();
    if (!salon) {
      throw new Error('Salon not found');
    }

    const referral = await ctx.db
      .query('salon_referral')
      .withIndex('by_salon_id', (q) =>
        q.eq('salonId', salon?._id as Id<'salon'>).eq('isArchive', false)
      )
      .first();
    if (!referral) {
      throw new Error('Referral not found');
    }

    await ctx.db.patch(referral._id, {
      referralCount: args.newReferralCount,
      updatedAt: Date.now(),
    });

    return true;
  },
});

// データを削除するためのAPI
// FIXME:本番後は削除してください
// メイン関数：削除プロセスを開始
export const destroy = mutation({
  handler: async (ctx) => {
    const tables = [
      'admin',
      'subscription',
      'salon_option',
      'salon',
      'salon_api_config',
      'salon_config',
      'salon_schedule_config',
      'salon_referral',
      'salon_week_schedule',
      'salon_schedule_exception',
      'staff_week_schedule',
      'staff_schedule',
      'customer',
      'customer_detail',
      'customer_points',
      'carte',
      'carte_detail',
      'staff',
      'staff_auth',
      'time_card',
      'staff_config',
      'menu',
      'menu_exclusion_staff',
      'coupon',
      'coupon_exclusion_menu',
      'coupon_config',
      'coupon_transaction',
      'reservation',
      'point_config',
      'point_exclusion_menu',
      'point_task_queue',
      'point_auth',
      'point_transaction',
    ] as TableNames[];

    // 最初のテーブルから削除プロセスを開始
    await ctx.scheduler.runAfter(0, internal.admin.mutation.deleteTableBatch, {
      tableIndex: 0,
      tables,
      cursor: undefined,
    });

    return { success: true, message: 'データ削除プロセスを開始しました' };
  },
});

// FIXME:本番後は削除してください
// 内部ミューテーション：バッチ削除を実行
export const deleteTableBatch = internalMutation({
  args: {
    tableIndex: v.number(),
    tables: v.array(v.string()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { tableIndex, tables, cursor } = args;

    // すべてのテーブルを処理し終えたら終了
    if (tableIndex >= tables.length) {
      return { success: true, message: 'すべてのテーブルの削除が完了しました' };
    }

    const currentTable = tables[tableIndex] as TableNames;
    const BATCH_SIZE = 100;

    // 現在のテーブルから1ページ分のデータを取得
    const { page, continueCursor, isDone } = await ctx.db
      .query(currentTable)
      .paginate({ cursor: cursor || null, numItems: BATCH_SIZE });

    // 取得したドキュメントを削除
    for (const doc of page) {
      await ctx.db.delete(doc._id);
    }

    // 次のバッチをスケジュール
    if (!isDone) {
      // 同じテーブルの次のページを処理
      await ctx.scheduler.runAfter(0, internal.admin.mutation.deleteTableBatch, {
        tableIndex,
        tables,
        cursor: continueCursor,
      });
    } else {
      // 次のテーブルを処理
      await ctx.scheduler.runAfter(0, internal.admin.mutation.deleteTableBatch, {
        tableIndex: tableIndex + 1,
        tables,
        cursor: undefined,
      });
    }

    return { success: true };
  },
});
