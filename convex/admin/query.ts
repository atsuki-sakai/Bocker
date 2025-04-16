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
    console.info(
      'includeUpdated: 当月にクーポンを適用済みのデータを含むかどうか - true: 含む, false: 含めない',
      args.includeUpdated
    );
    console.info(
      'isApplyMaxUseReferral: 紹介上限値を超えたデータを含むかどうか - true: 含む, false: 含めない',
      args.isApplyMaxUseReferral
    );
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

    // まず、条件に合うすべてのreferralを取得
    while (hasMore) {
      let query = ctx.db
        .query('salon_referral')
        .withIndex('by_referral_and_total_count')
        .filter((q) =>
          q.and(
            // referralCountが1以上のデータのみ取得（0や未定義は除外）
            q.gt(q.field('referralCount'), 0),
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
      console.debug(`取得したreferralレコード数: ${batch.page.length}`);

      if (batch.page.length > 0) {
        // データの検証（安全策として）
        const validReferrals = batch.page.filter(
          (referral) => typeof referral.referralCount === 'number' && referral.referralCount > 0
        );
        console.debug(`有効なreferralレコード数: ${validReferrals.length}/${batch.page.length}`);

        // 一度にすべてのsalonIdsを収集
        const salonIds = validReferrals.map((referral) => referral.salonId);

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
    
    console.info(`最終取得メールアドレス数: ${allSalonEmails.length}`);
    
    return {
      includeUpdated: args.includeUpdated,
      isApplyMaxUseReferral: args.isApplyMaxUseReferral || false,
      maxReferralCount: MAX_REFERRAL_COUNT,
      total: allSalonEmails.length,
      allSalonEmails: allSalonEmails,
    };
  },
});
