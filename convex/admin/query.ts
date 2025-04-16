import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { checkAuth } from '@/services/convex/shared/utils/auth';

// 紹介数を指定して取得するためのAPI
export const getEmailsByReferralCount = query({
  args: {
    orderReferralCount: v.number(),
    includeUpdated: v.boolean(),
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

    // Process in batches using pagination
    while (hasMore) {
      let query = ctx.db
        .query('salon_referral')
        .filter((q) => q.gte(q.field('referralCount'), args.orderReferralCount));

      // includeUpdatedフラグに基づいてフィルタリング
      if (!args.includeUpdated) {
        // updatedAtが存在し（nullでない）、かつ当月でないレコードのみを取得
        query = query.filter((q) =>
          q.and(
            q.neq(q.field('updatedAt'), null), // updatedAtが存在する（nullでない）
            q.or(
              q.lt(q.field('updatedAt'), startOfMonth), // 当月より前の更新
              q.gt(q.field('updatedAt'), endOfMonth) // 当月より後の更新（将来の予約など）
            )
          )
        );
      }
      // includeUpdatedがtrueの場合は、updatedAtに関係なく全てのレコードを取得（追加のフィルタは不要）

      const batch = await query.paginate({ cursor, numItems: batchSize });

      // Fetch all salons in one batch
      const salons = await Promise.all(batch.page.map((referral) => ctx.db.get(referral.salonId)));

      // Extract emails, ensuring they are all strings (no undefined values)
      const emails = salons
        .filter((salon) => salon !== null && salon !== undefined)
        .map((salon) => salon.email)
        .filter((email): email is string => email !== undefined && email !== null);

      // Add emails to the result array
      allSalonEmails = [...allSalonEmails, ...emails];

      // Check if we need to continue
      hasMore = !batch.isDone;
      cursor = batch.continueCursor;

      // Safety check to avoid hitting read limits
      if (allSalonEmails.length > 500) break;
    }

    return [
      {
        orderReferralCount: args.orderReferralCount,
        includeUpdated: args.includeUpdated,
        total: allSalonEmails.length,
      },
      allSalonEmails,
    ];
  },
});
