import { mutation, internalMutation } from '@/convex/_generated/server'
import { v } from 'convex/values'
import { checkAuth } from '@/convex/utils/auth'
import { imageType } from '../types'
import { createRecord, killRecord, updateRecord } from '../utils/helpers'
import { ConvexError } from 'convex/values'
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants'
import { MAX_OPTION_STOCK } from '@/convex/constants'
import { getPlanLimits } from '@/convex/utils/helpers'
import { subscriptionPlanNameType } from '@/convex/types'

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
    
    return await createRecord(ctx, 'option', {
      tenant_id: args.tenant_id,
      org_id: args.org_id,
      name: args.name, // オプションメニュー名
      unit_price: args.unit_price, // 価格
      sale_price: args.sale_price, // セール価格
      order_limit: args.order_limit, // 注文制限
      in_stock: args.in_stock, // 在庫数
      duration_min: args.duration_min, // 時間(分)
      tags: args.tags, // タグ
      description: args.description, // 説明
      images: args.images, // 画像
      is_active: args.is_active, // 有効/無効フラグ
    })
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
    quantity: v.number(), // 負の値で減算、正の値で加算
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
    
    // 在庫管理されていないオプションの場合はエラー
    if (option.in_stock === null || option.in_stock === undefined) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'option.balanceStock',
        message: '在庫管理されていないオプションです',
        code: 'BAD_REQUEST',
        title: '在庫管理されていないオプションです',
        details: {
          ...args,
        },
      })
    }
    
    // 新しい在庫数を計算
    const newStock = option.in_stock + args.quantity
    
    // 在庫数が負になる場合はエラー
    if (newStock < 0) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'option.balanceStock',
        message: '在庫が不足しています',
        code: 'INSUFFICIENT_STOCK',
        title: '在庫が不足しています',
        details: {
          ...args,
          currentStock: option.in_stock,
          requestedChange: args.quantity,
        },
      })
    }
    
    // 在庫数が最大値を超える場合はエラー
    if (newStock > MAX_OPTION_STOCK) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'option.balanceStock',
        message: `在庫数は${MAX_OPTION_STOCK}が最大です。`,
        code: 'BAD_REQUEST',
        title: `在庫数は${MAX_OPTION_STOCK}が最大です。`,
        details: {
          ...args,
          currentStock: option.in_stock,
          requestedChange: args.quantity,
          resultStock: newStock,
        },
      })
    }
    
    return await updateRecord(ctx, args.option_id, { in_stock: newStock })
  },
})

// 予約キャンセル時の在庫復元処理
// 予約詳細から使用したオプションの在庫を復元する
export const restoreStockForCancelledReservation = mutation({
  args: {
    reservationDetailId: v.id("reservation_detail"),
  },
  handler: async (ctx, args) => {
    const detail = await ctx.db.get(args.reservationDetailId);
    if (!detail) {
      return { 
        success: false, 
        message: 'Reservation detail not found',
        restoredCount: 0 
      };
    }
    
    const restoreOperations = [];
    
    // オプションの在庫を復元
    if (detail.options && Array.isArray(detail.options)) {
      for (const opt of detail.options) {
        if (opt.id && opt.quantity > 0) {
          const option = await ctx.db.get(opt.id);
          if (option && typeof option.in_stock === 'number') {
            restoreOperations.push(
              ctx.db.patch(opt.id, {
                in_stock: option.in_stock + opt.quantity,
                updated_at: Date.now(),
              })
            );
          }
        }
      }
    }
    
    await Promise.all(restoreOperations);
    
    return { 
      success: true, 
      message: 'Stock restored successfully',
      restoredCount: restoreOperations.length 
    };
  },
});
