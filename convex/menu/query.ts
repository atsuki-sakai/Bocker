import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { checkAuth } from '@/convex/utils/auth';
import { paginationOptsValidator } from 'convex/server';
import { genderType, activeCustomerType, menuCategoryType, MenuCategory } from '@/convex/types';


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
    option_ids: v.array(v.id('option')),
  },
  handler: async (ctx, args) => {
    // Promise.allを使用して並列に取得
    const menus = await Promise.all(
      args.menu_ids.map(async (menu_id) => {
        return await ctx.db.get(menu_id);
      })
    );

    const options = await Promise.all(
      args.option_ids.map(async (optionId) => {
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
          categories: menu.categories,
          target_type: menu.target_type,
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
        q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('is_active', args.activeOnly ?? true).eq('is_archive', args.includeArchive ?? false)
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
    target_type: activeCustomerType,
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    active_only: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    return await ctx.db
      .query('menu')
      .withIndex('by_tenant_org_type_active_archive', (q) =>
        q
          .eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
          .eq('target_type', args.target_type)
          .eq('is_active', args.active_only ?? true)
          .eq('is_archive', false)
      )
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
      .withIndex('by_tenant_org_gender_active_archive', (q) =>
        q
          .eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
          .eq('target_gender', args.target_gender)
          .eq('is_active', args.active_only ?? true)
          .eq('is_archive', false)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts);
  },
});

export const getMenusByCategories = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    categories: v.array(menuCategoryType),
    target_type: v.optional(activeCustomerType),
    target_gender: v.optional(genderType),
  },
  handler: async (ctx, args) => {
    // target_type / target_gender が指定されている場合はそれぞれインデックスで先に絞り込み、
    // そうでない場合は汎用インデックスで取得し、後段でfilterします。

    const baseQuery = ctx.db
      .query('menu')
      .withIndex('by_tenant_org_active_archive', (q) =>
        q
          .eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
          .eq('is_active', true)
          .eq('is_archive', false)
      );

    const allMenus = await baseQuery.collect();

    console.log('allMenus', allMenus)
    console.log('args.categories', args.categories)
    return allMenus.filter((menu) => {
      // target_type フィルタ
      const typeMatch = args.target_type ? menu.target_type === args.target_type : true;

      // target_gender フィルタ
      const genderMatch = args.target_gender ? menu.target_gender === args.target_gender : true;

      // カテゴリフィルタ（指定が無い場合は全て許容）
      const categoryMatch = args.categories.length === 0
        ? true
        : (menu.categories ?? []).some((category) =>
            args.categories.includes(category as MenuCategory)
          );

      return typeMatch && genderMatch && categoryMatch;
    });
  },
})
