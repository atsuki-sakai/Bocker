import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { checkAuth } from '@/convex/utils/auth';
import { paginationOptsValidator } from 'convex/server';
import { genderType, targetType, menuCategoryType, MenuCategory } from '@/convex/types';


// メニューIDからメニューを取得
export const findById = query({
  args: {
    menu_id: v.id('menu'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    return await ctx.db.get(args.menu_id);
  },
});

export const getDisplayByIds = query({
  args: {
    menu_ids: v.array(v.id('menu')),
    options: v.array(v.id('option')),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);

    // Promise.allを使用して並列に取得
    const menus = await Promise.all(
      args.menu_ids.map(async (menu_id) => {
        return await ctx.db.get(menu_id);
      })
    );

    const options = await Promise.all(
      args.options.map(async (optionId) => {
        return await ctx.db.get(optionId);
      })
    );

    return {
      menus: menus
        .filter((menu) => menu !== null) // nullを除外
        .map((menu) => ({
          _id: menu._id,
          name: menu.name,
          unit_price: menu.unit_price,
          sale_price: menu.sale_price,
          duration_min: menu.duration_min,
          categories: menu.categories || [],
        })),
      options: options
        .filter((option) => option !== null) // nullを除外
        .map((option) => ({
          _id: option._id,
          name: option.name,
          unit_price: option.unit_price,
          sale_price: option.sale_price,
          duration_min: option.duration_min,
          in_stock: option.in_stock,
        })),
    }
  },
});
// サロンIDからメニュー一覧を取得
export const listByTenantAndOrg = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    activeOnly: v.optional(v.boolean()),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true)
    return await ctx.db
      .query('menu')
      .withIndex('by_tenant_org_active_archive', (q) =>
        q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('is_active', args.activeOnly || false).eq('is_archive', args.includeArchive || false)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts);
  },
});

// タイプでメニューを取得
export const listByType = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    target_type: targetType,
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    active_only: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    return await ctx.db
      .query('menu')
      .withIndex('by_tenant_org_active_archive', (q) =>
        q
          .eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
          .eq('is_active', args.active_only || false)
      ).filter((q) => q.eq('target_type', args.target_type))
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts);
  },
});

// 性別でメニューを取得
export const listByGender = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    target_gender: genderType,
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    active_only: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    return await ctx.db
      .query('menu')
      .withIndex('by_tenant_org_active_archive', (q) =>
        q
          .eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
          .eq('is_active', args.active_only || false)
      ).filter((q) => q.eq('target_gender', args.target_gender))
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts);
  },
});

export const getMenusByCategories = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    categories: v.array(menuCategoryType),
  },
  handler: async (ctx, args) => {
    // サロンIDでフィルタリングしたメニューをすべて取得
    const allMenus = await ctx.db
      .query('menu')
      .withIndex('by_tenant_org_active_archive', (q) => q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('is_active', true))
      .collect()

    // カテゴリでフィルタリング
    // 引数のcategoriesの少なくとも1つが、メニューのcategoriesに含まれているものを返す
    return allMenus.filter((menu) => {
      if (!menu.categories) return false
      return args.categories.some(
        (category) => menu.categories && menu.categories.includes(category as MenuCategory)
      )
    })
  },
})
