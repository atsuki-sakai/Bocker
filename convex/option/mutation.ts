import { mutation } from '@/convex/_generated/server'
import { v } from 'convex/values'
import { optionService } from '@/services/convex/services'
import { checkAuth } from '@/services/convex/shared/utils/auth'
import { validateOption } from '@/services/convex/shared/utils/validation'

export const create = mutation({
  args: {
    salonId: v.id('salon'),
    name: v.string(), // オプションメニュー名
    unitPrice: v.number(), // 価格
    salePrice: v.optional(v.number()), // セール価格
    orderLimit: v.optional(v.number()), // 注文制限
    inStock: v.optional(v.number()), // 在庫数
    timeToMin: v.number(), // 時間(分)
    tags: v.optional(v.array(v.string())), // タグ
    description: v.optional(v.string()), // 説明
    imgPath: v.optional(v.string()), // 画像ファイルパス
    thumbnailPath: v.optional(v.string()), // サムネイル画像ファイルパス
    isActive: v.optional(v.boolean()), // 有効/無効フラグ
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    validateOption(args)
    return await optionService.createOption(ctx, args)
  },
})
export const update = mutation({
  args: {
    optionId: v.id('salon_option'),
    name: v.optional(v.string()), // オプションメニュー名
    unitPrice: v.optional(v.number()), // 価格
    salePrice: v.optional(v.number()), // セール価格
    orderLimit: v.optional(v.number()), // 注文制限
    inStock: v.optional(v.number()), // 在庫数
    timeToMin: v.optional(v.number()), // 時間(分)
    tags: v.optional(v.array(v.string())), // タグ
    description: v.optional(v.string()), // 説明
    imgPath: v.optional(v.string()), // 画像ファイルパス
    thumbnailPath: v.optional(v.string()), // サムネイル画像ファイルパス
    isActive: v.optional(v.boolean()), // 有効/無効フラグ
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    validateOption(args)
    const { optionId, ...updateData } = args
    return await optionService.updateOption(ctx, optionId, updateData)
  },
})
export const kill = mutation({
  args: {
    optionId: v.id('salon_option'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    return await optionService.killOption(ctx, args)
  },
})

export const balanceStock = mutation({
  args: {
    optionId: v.id('salon_option'),
    newQuantity: v.number(),
  },
  handler: async (ctx, args) => {
    const option = await ctx.db.get(args.optionId)
    if (!option) {
      throw new Error('オプションが見つかりません')
    }
    if (option.inStock && option.inStock > 9999) {
      throw new Error('在庫数は9999が最大です。')
    }
    return await ctx.db.patch(args.optionId, { inStock: args.newQuantity })
  },
})
