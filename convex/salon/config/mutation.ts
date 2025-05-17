import { mutation } from '../../_generated/server';
import { v } from 'convex/values';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { validateSalonConfig } from '@/services/convex/shared/utils/validation';
import { salonService } from '@/services/convex/services';

export const create = mutation({
  args: {
    salonId: v.id('salon'),
    salonName: v.string(),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true);
    validateSalonConfig(args);
    return await salonService.upsertConfig(ctx, args, true);
  },
});

export const upsert = mutation({
  args: {
    salonId: v.id('salon'),
    salonName: v.optional(v.string()), // サロン名
    email: v.optional(v.string()), // メールアドレス
    phone: v.optional(v.string()), // 電話番号
    postalCode: v.optional(v.string()), // 郵便番号
    address: v.optional(v.string()), // 住所
    reservationRules: v.optional(v.string()), // 予約ルール
    imgPath: v.optional(v.string()), // 画像ファイルパス
    thumbnailPath: v.optional(v.string()), // サムネイルファイルパス
    description: v.optional(v.string()), // 説明
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateSalonConfig(args);
    return await salonService.upsertConfig(ctx, args, true);
  },
});
