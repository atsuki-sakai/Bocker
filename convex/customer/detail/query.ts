import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { validateRequired } from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { ConvexCustomError } from '@/services/convex/shared/utils/error';

// 顧客IDから詳細情報を取得
export const getByCustomerId = query({
  args: {
    customerId: v.id('customer'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.customerId, 'customerId');
    // 顧客の存在確認
    const customer = await ctx.db.get(args.customerId);
    if (!customer) {
      const err = new ConvexCustomError('low', '指定された顧客が存在しません', 'NOT_FOUND', 404, {
        ...args,
      });
      throw err;
    }

    const detail = await ctx.db
      .query('customer_detail')
      .withIndex('by_customer_id', (q) => q.eq('customerId', args.customerId))
      .first();

    return detail;
  },
});
