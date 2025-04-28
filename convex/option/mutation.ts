import { mutation } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { optionService } from '@/services/convex/services';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { validateOption } from '@/services/convex/shared/utils/validation';

export const create = mutation({
  args: {
    salonId: v.id('salon'),
    name: v.string(), // オプションメニュー名
    unitPrice: v.number(), // 価格
    salePrice: v.optional(v.number()), // セール価格
    orderLimit: v.optional(v.number()), // 注文制限
    timeToMin: v.number(), // 時間(分)
    ensureTimeToMin: v.optional(v.number()), // 座席を確保する時間(分): パーマなどの場合作業時間と確保する時間の差分の待ち時間が発生する為、予約枠の計算はtimeToMinを使用して効率的に予約できるようにするため
    tags: v.optional(v.array(v.string())), // タグ
    description: v.optional(v.string()), // 説明
    isActive: v.optional(v.boolean()), // 有効/無効フラグ
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateOption(args);
    return await optionService.createOption(ctx, args);
  },
});
export const update = mutation({
  args: {
    optionId: v.id('salon_option'),
    name: v.optional(v.string()), // オプションメニュー名
    unitPrice: v.optional(v.number()), // 価格
    salePrice: v.optional(v.number()), // セール価格
    orderLimit: v.optional(v.number()), // 注文制限
    timeToMin: v.optional(v.number()), // 時間(分)
    ensureTimeToMin: v.optional(v.number()), // 座席を確保する時間(分): パーマなどの場合作業時間と確保する時間の差分の待ち時間が発生する為、予約枠の計算はtimeToMinを使用して効率的に予約できるようにするため
    tags: v.optional(v.array(v.string())), // タグ
    description: v.optional(v.string()), // 説明
    isActive: v.optional(v.boolean()), // 有効/無効フラグ
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateOption(args);
    const { optionId, ...updateData } = args;
    return await optionService.updateOption(ctx, optionId, updateData);
  },
});
export const kill = mutation({
  args: {
    optionId: v.id('salon_option'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    return await optionService.killOption(ctx, args);
  },
});
