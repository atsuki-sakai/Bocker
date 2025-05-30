import { mutation } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { createRecord, killRecord, archiveRecord, excludeFields, updateRecord } from '@/convex/utils/helpers';
import { validateNumberLength, validateStringLength } from '@/convex/utils/validations';
import { checkAuth } from '@/convex/utils/auth';
import { ConvexError } from 'convex/values';
import { ERROR_SEVERITY, ERROR_STATUS_CODE } from '@/lib/errors/constants';
import {
  genderType,
  activeCustomerType,
  menuPaymentMethodType,
  menuCategoryType,
  imageType
} from '@/convex/types';

// メニューの追加
export const create = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    name: v.string(),
    categories: v.array(menuCategoryType),
    unit_price: v.number(),
    sale_price: v.optional(v.number()),
    duration_min: v.number(),
    images: v.array(imageType),
    description: v.optional(v.string()),
    target_gender: genderType,
    target_type: activeCustomerType,
    tags: v.array(v.string()),
    payment_method: menuPaymentMethodType,
    is_active: v.boolean(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    validateStringLength(args.name, 'メニュー名は必須です')
    validateNumberLength(args.unit_price, '単価は必須です')
    validateNumberLength(args.sale_price, '販売価格は必須です')
    validateNumberLength(args.duration_min, '所要時間は必須です')
    // 組織の存在確認
    const org = await ctx.db.get(args.org_id)
    if (!org) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'menu.core.create',
        message: '組織が見つかりませんでした。',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          ...args,
        },
      });
    }

    return await createRecord(ctx, 'menu', {
      tenant_id: args.tenant_id,
      org_id: args.org_id,
      name: args.name,
      categories: args.categories,
      unit_price: args.unit_price,
      sale_price: args.sale_price,
      duration_min: args.duration_min,
      images: args.images,
      description: args.description,
      target_gender: args.target_gender,
      target_type: args.target_type,
      tags: args.tags,
      payment_method: args.payment_method,
      is_active: args.is_active,
    });
  },
})

// メニュー情報の更新
export const update = mutation({
  args: {
    menu_id: v.id('menu'),
    name: v.optional(v.string()),
    categories: v.optional(v.array(menuCategoryType)),
    unit_price: v.optional(v.number()),
    sale_price: v.optional(v.number()),
    duration_min: v.optional(v.number()),
    images: v.optional(v.array(imageType)),
    description: v.optional(v.string()),
    target_gender: v.optional(genderType),
    target_type: v.optional(activeCustomerType),
    tags: v.optional(v.array(v.string())),
    payment_method: v.optional(menuPaymentMethodType),
    is_active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    validateStringLength(args.name, 'メニュー名は必須です')
    validateNumberLength(args.unit_price, '単価は必須です')
    validateNumberLength(args.sale_price, '販売価格は必須です')
    validateNumberLength(args.duration_min, '所要時間は必須です')

    const menu = await ctx.db.get(args.menu_id)
    if (!menu) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'menu.core.update',
        message: 'メニューが見つかりませんでした。',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          ...args,
        },
      });
    }

    return await updateRecord(ctx, menu._id, {
      name: args.name ?? menu.name,
      categories: args.categories ?? menu.categories,
      unit_price: args.unit_price ?? menu.unit_price,
      sale_price: args.sale_price ?? menu.sale_price,
      duration_min: args.duration_min ?? menu.duration_min,
      images: args.images ?? menu.images,
      description: args.description ?? menu.description,
      target_gender: args.target_gender ?? menu.target_gender,
      target_type: args.target_type ?? menu.target_type,
      tags: args.tags ?? menu.tags,
      payment_method: args.payment_method ?? menu.payment_method,
      is_active: args.is_active ?? menu.is_active,
    })

  },
})

// メニューの削除
export const archive = mutation({
  args: {
    menu_id: v.id('menu'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    return await archiveRecord(ctx, args.menu_id)
  },
})

export const kill = mutation({
  args: {
    menu_id: v.id('menu'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    return await killRecord(ctx, args.menu_id);
  },
});
