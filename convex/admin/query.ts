import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { checkAuth } from '@/services/convex/shared/utils/auth';

// 上限値を定数として定義
const MAX_REFERRAL_COUNT = 6;

// 紹介数を指定して取得するためのAPI
export const getEmailsByReferralCount = query({
  args: {
    includeUpdated: v.boolean(), // 当月に更新されたデータを含むかどうか
    isApplyMaxUseReferral: v.boolean(), // 上限値を超えたデータを含むかどうか
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true);
    const batchSize = 100; // Process in smaller batches
    let allSalonEmails: string[] = [];
    let cursor = null;
    let hasMore = true;

    // 当月の開始日と終了日を計算
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startOfMonth = firstDayOfMonth.getTime();
    const endOfMonth = firstDayOfNextMonth.getTime() - 1;

    console.log(
      `検索条件: includeUpdated=${args.includeUpdated}, isApplyMaxUseReferral=${args.isApplyMaxUseReferral}`
    );

    // まず、条件に合うすべてのreferralを取得
    while (hasMore) {
      let query = ctx.db
        .query('salon_referral')
        .withIndex('by_referral_and_total_count')
        .filter((q) =>
          q.and(
            q.gte(q.field('referralCount'), 1), // referralCountが1以上のデータを取得
            q.eq(q.field('isArchive'), false)
          )
        );

      // totalReferralCountによる絞り込み（isApplyMaxUseReferralがtrueの場合は適用しない）
      if (!args.isApplyMaxUseReferral) {
        query = query.filter((q) =>
          q.or(
            q.eq(q.field('totalReferralCount'), null),
            q.lt(q.field('totalReferralCount'), MAX_REFERRAL_COUNT)
          )
        );
      }

      // includeUpdatedフラグに基づいてフィルタリング
      if (!args.includeUpdated) {
        // 当月に更新されたデータを除外（当月のupdatedAtを持つレコードを除外）
        query = query.filter((q) =>
          q.or(
            q.eq(q.field('updatedAt'), null), // updatedAtがnullの場合は含める
            q.lt(q.field('updatedAt'), startOfMonth), // 当月より前の更新
            q.gt(q.field('updatedAt'), endOfMonth) // 当月より後の更新（将来の予約など）
          )
        );
      }
      // includeUpdatedがtrueの場合は、全てのレコードを取得（フィルタは不要）

      const batch = await query.paginate({ cursor, numItems: batchSize });
      console.log(`取得したreferralレコード数: ${batch.page.length}`);

      if (batch.page.length > 0) {
        // 一度にすべてのsalonIdsを収集
        const salonIds = batch.page.map((referral) => referral.salonId);

        // salonIdsを使って対応するサロンを一括で取得
        for (const salonId of salonIds) {
          const salon = await ctx.db.get(salonId);
          if (salon && salon.email && !salon.isArchive) {
            allSalonEmails.push(salon.email);
          }
        }
      }

      // Check if we need to continue
      hasMore = !batch.isDone;
      cursor = batch.continueCursor;

      // Safety check to avoid hitting read limits
      if (allSalonEmails.length > 500) break;
    }

    console.log(`最終取得メールアドレス数: ${allSalonEmails.length}`);

    return [
      {
        includeUpdated: args.includeUpdated,
        isApplyMaxUseReferral: args.isApplyMaxUseReferral || false,
        maxReferralCount: MAX_REFERRAL_COUNT,
        total: allSalonEmails.length,
      },
      allSalonEmails,
    ];
  },
});
