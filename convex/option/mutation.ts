import { mutation } from '@/convex/_generated/server'
import { v } from 'convex/values'
import { checkAuth } from '@/convex/utils/auth'
import { imageType } from '../types'
import { createRecord, killRecord, updateRecord } from '../utils/helpers'
import { ConvexError } from 'convex/values'
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants'
import { MAX_OPTION_STOCK } from '@/convex/constants'

export const create = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    name: v.string(), // オプションメニュー名
    unit_price: v.number(), // 価格
    sale_price: v.optional(v.number()), // セール価格
    order_limit: v.number(), // 注文制限
    in_stock: v.number(), // 在庫数
    duration_min: v.number(), // 時間(分)
    tags: v.array(v.string()), // タグ
    description: v.optional(v.string()), // 説明
    images: v.array(imageType), // 画像
    is_active: v.boolean(), // 有効/無効フラグ
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    return await createRecord(ctx, 'option', args)
  },
})
export const update = mutation({
  args: {
    option_id: v.id('option'),
    name: v.optional(v.string()), // オプションメニュー名
    unit_price: v.optional(v.number()), // 価格
    sale_price: v.optional(v.number()), // セール価格
    order_limit: v.optional(v.number()), // 注文制限
    in_stock: v.optional(v.number()), // 在庫数
    duration_min: v.optional(v.number()), // 時間(分)
    tags: v.optional(v.array(v.string())), // タグ
    description: v.optional(v.string()), // 説明
    images: v.optional(v.array(imageType)), // 画像
    is_active: v.optional(v.boolean()), // 有効/無効フラグ
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    const option = await ctx.db.get(args.option_id)
    if (!option) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'option.update',
        message: 'オプションが見つかりません',
        code: 'NOT_FOUND',
        title: 'オプションが見つかりません',
        details: {
          ...args,
        },
      })
    }
    const { option_id, ...updateData } = args
    return await updateRecord(ctx, option_id, updateData)
  },
})

export const kill = mutation({
  args: {
    option_id: v.id('option'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    return await killRecord(ctx, args.option_id)
  },
})

export const balanceStock = mutation({
  args: {
    option_id: v.id('option'),
    new_quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const option = await ctx.db.get(args.option_id)
    if (!option) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'option.balanceStock',
        message: 'オプションが見つかりません',
        code: 'NOT_FOUND',
        title: 'オプションが見つかりません',
        details: {
          ...args,
        },
      })
    }
    if (option.in_stock && option.in_stock > MAX_OPTION_STOCK) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'option.balanceStock',
        message: `在庫数は${MAX_OPTION_STOCK}が最大です。`,
        code: 'BAD_REQUEST',
        title: `在庫数は${MAX_OPTION_STOCK}が最大です。`,
        details: {
          ...args,
        },
      })
    }
    return await updateRecord(ctx, args.option_id, { in_stock: args.new_quantity })
  },
})
