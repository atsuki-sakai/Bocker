import { mutation, query, internalMutation } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants';
import { Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';

/**
 * 在庫チェックと利用可能在庫数の取得
 * 楽観的アプローチのため、仮押さえではなく現在の在庫数を直接返す
 */
export const checkStockAvailability = query({
  args: {
    optionId: v.id("option"),
    quantity: v.number(),
  },
  returns: v.object({
    available: v.boolean(),
    currentStock: v.optional(v.number()),
    isLowStock: v.optional(v.boolean()),
    unlimited: v.optional(v.boolean()),
    reason: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const option = await ctx.db.get(args.optionId);
    if (!option || option.is_archive) {
      return { 
        available: false, 
        reason: "オプションが見つかりません" 
      };
    }
    
    // 在庫管理対象外
    if (option.in_stock === null || option.in_stock === undefined) {
      return { 
        available: true, 
        unlimited: true 
      };
    }
    
    // 在庫チェック
    if (option.in_stock < args.quantity) {
      return { 
        available: false, 
        reason: `在庫不足（残り${option.in_stock}個）`,
        currentStock: option.in_stock,
      };
    }
    
    // 低在庫警告
    const isLowStock = option.low_stock_threshold !== undefined && 
      option.in_stock <= option.low_stock_threshold;
    
    return { 
      available: true,
      currentStock: option.in_stock,
      isLowStock,
    };
  },
});

/**
 * 在庫数の一括更新（管理画面用）
 */
export const updateStockBulk = mutation({
  args: {
    updates: v.array(v.object({
      optionId: v.id("option"),
      newStock: v.union(v.number(), v.null()),
    })),
  },
  returns: v.array(
    v.union(
      v.object({ 
        optionId: v.id("option"), 
        success: v.boolean() 
      }),
      v.object({ 
        optionId: v.id("option"), 
        success: v.boolean(), 
        error: v.string() 
      })
    )
  ),
  handler: async (ctx, args) => {
    const results = await Promise.allSettled(
      args.updates.map(async (update) => {
        const option = await ctx.db.get(update.optionId);
        if (!option) {
          return {
            optionId: update.optionId,
            success: false,
            error: "オプションが見つかりません",
          };
        }
        
        await ctx.db.patch(update.optionId, {
          in_stock: update.newStock === null ? undefined : update.newStock,
          updated_at: Date.now(),
        });
        
        return { 
          optionId: update.optionId, 
          success: true 
        };
      })
    );
    
    return results.map(result => 
      result.status === 'fulfilled' 
        ? result.value 
        : { 
            optionId: (result as PromiseRejectedResult).reason.optionId || 'unknown' as Id<"option">, 
            success: false, 
            error: (result as PromiseRejectedResult).reason.message || '不明なエラー' 
          }
    );
  },
});

/**
 * 在庫低下アラート取得
 * 低在庫閾値以下のオプションを返す
 */
export const getLowStockOptions = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
  },
  returns: v.array(v.object({
    _id: v.id('option'),
    name: v.string(),
    in_stock: v.number(),
    low_stock_threshold: v.number(),
  })),
  handler: async (ctx, args) => {
    const options = await ctx.db
      .query('option')
      .withIndex('by_tenant_org_active_archive', (q) =>
        q.eq('tenant_id', args.tenant_id)
         .eq('org_id', args.org_id)
         .eq('is_active', true)
         .eq('is_archive', false)
      )
      .collect();
    
    return options
      .filter(opt => 
        opt.in_stock !== null && 
        opt.in_stock !== undefined &&
        opt.low_stock_threshold !== null &&
        opt.low_stock_threshold !== undefined &&
        opt.in_stock <= opt.low_stock_threshold
      )
      .map(opt => ({
        _id: opt._id,
        name: opt.name,
        in_stock: opt.in_stock!,
        low_stock_threshold: opt.low_stock_threshold!,
      }));
  },
});

/**
 * 予約作成時の在庫減算処理（内部用）
 * 楽観的アプローチ: 即座に在庫を減算
 */
export const decrementStockForReservation = internalMutation({
  args: {
    options: v.array(v.object({
      id: v.id("option"),
      quantity: v.number(),
    })),
  },
  returns: v.object({
    success: v.boolean(),
    errors: v.array(v.object({
      optionId: v.id("option"),
      error: v.string(),
    })),
  }),
  handler: async (ctx, args) => {
    const errors = [];
    
    for (const item of args.options) {
      const option = await ctx.db.get(item.id);
      
      // 在庫管理対象外の場合はスキップ
      if (!option || option.in_stock === null || option.in_stock === undefined) {
        continue;
      }
      
      // 在庫不足チェック
      if (option.in_stock < item.quantity) {
        errors.push({
          optionId: item.id,
          error: `${option.name}の在庫が不足しています（残り${option.in_stock}個）`,
        });
        continue;
      }
      
      // 在庫減算
      await ctx.db.patch(item.id, {
        in_stock: option.in_stock - item.quantity,
        updated_at: Date.now(),
      });
    }
    
    return {
      success: errors.length === 0,
      errors,
    };
  },
});

/**
 * 予約キャンセル時の在庫復元処理（内部用）
 * 楽観的アプローチ: 在庫を復元
 */
export const restoreStockForCancellation = internalMutation({
  args: {
    options: v.array(v.object({
      id: v.id("option"),
      quantity: v.number(),
    })),
  },
  returns: v.object({
    success: v.boolean(),
    restoredCount: v.number(),
  }),
  handler: async (ctx, args) => {
    let restoredCount = 0;
    
    for (const item of args.options) {
      const option = await ctx.db.get(item.id);
      if (option && typeof option.in_stock === 'number') {
        await ctx.db.patch(item.id, {
          in_stock: option.in_stock + item.quantity,
          updated_at: Date.now(),
        });
        restoredCount++;
      }
    }
    
    return {
      success: true,
      restoredCount,
    };
  },
});