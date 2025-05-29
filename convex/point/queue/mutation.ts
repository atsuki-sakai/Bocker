import { mutation } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { checkAuth } from '@/convex/utils/auth';
import { createRecord, killRecord } from '@/convex/utils/helpers';
import { validateRequiredNumber, validateStringLength } from '@/convex/utils/validations';
import { ConvexError } from 'convex/values';
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants';

// ポイントキューの追加
export const create = mutation({
  args: {
    tenant_id: v.id('tenant'), // テナントID
    org_id: v.id('organization'), // 店舗ID
    reservation_id: v.id('reservation'), // 予約ID
    customer_id: v.string(), // 顧客ID
    points: v.number(), // 付与予定のポイント数
    scheduled_for_unix: v.number(), // ポイント付与予定日時(Unix timestamp)
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    validateStringLength(args.customer_id, 'customer_id')
    validateRequiredNumber(args.points, 'points')

    // 予約の存在確認
    const reservation = await ctx.db.get(args.reservation_id)
    if(!reservation || reservation.status !== 'completed') {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'point.queue.create',
        message: '指定された予約は完了されていません。',
        code: 'BAD_REQUEST',
      })
    }
    return await createRecord(ctx, 'point_queue', args)
  },
})

export const kill = mutation({
  args: {
    point_queue_id: v.id('point_queue'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    return await killRecord(ctx, args.point_queue_id);
  },
});
