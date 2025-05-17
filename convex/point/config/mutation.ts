import { mutation } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { validatePointConfig, validateRequired } from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { pointService } from '@/services/convex/services';

export const upsert = mutation({
  args: {
    salonId: v.id('salon'),
    isActive: v.optional(v.boolean()), // 有効/無効フラグ
    isFixedPoint: v.optional(v.boolean()), // 固定ポイントかどうか
    pointRate: v.optional(v.number()), // ポイント付与率  利用金額に対しての付与率 (例: 0.1なら10%)
    fixedPoint: v.optional(v.number()), // 固定ポイント (例: 100円につき1ポイント)
    pointExpirationDays: v.optional(v.number()), // ポイントの有効期限(日)
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validatePointConfig(args);
    return await pointService.upsertPointConfig(ctx, args.salonId, args);
  },
});
