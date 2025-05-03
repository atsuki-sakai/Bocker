import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { validateRequired } from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { throwConvexError } from '@/lib/error'
import { excludeFields } from '@/services/convex/shared/utils/helper'
export const getById = query({
  args: {
    customerId: v.id('customer'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    validateRequired(args.customerId, 'customerId')
    return await ctx.db.get(args.customerId)
  },
})

// サロンIDから顧客一覧を取得
export const findBySalonId = query({
  args: {
    salonId: v.id('salon'),
    searchTerm: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    validateRequired(args.salonId, 'salonId')

    // 検索条件が指定されていない場合は通常の一覧を返す
    if (!args.searchTerm || args.searchTerm.trim() === '') {
      return await ctx.db
        .query('customer')
        .withIndex('by_salon_id', (q) =>
          q.eq('salonId', args.salonId).eq('isArchive', args.includeArchive || false)
        )
        .order(args.sort || 'desc')
        .paginate(args.paginationOpts)
    }

    // 検索条件がある場合は検索を行う
    const searchTerm = args.searchTerm.toLowerCase().trim()

    // 名前での検索
    const nameResults = await ctx.db
      .query('customer')
      .withSearchIndex('search_searchble_text', (q) =>
        q.search('searchbleText', searchTerm).eq('salonId', args.salonId)
      )
      .collect()

    // 電話番号での検索
    const phoneResults = await ctx.db
      .query('customer')
      .withIndex('by_salon_phone', (q) => q.eq('salonId', args.salonId).eq('phone', searchTerm))
      .collect()

    // メールアドレスでの検索
    const emailResults = await ctx.db
      .query('customer')
      .withIndex('by_salon_email', (q) => q.eq('salonId', args.salonId).eq('email', searchTerm))
      .collect()

    // LINEユーザー名での検索
    const lineResults = await ctx.db
      .query('customer')
      .withIndex('by_salon_id_line_user_name', (q) =>
        q.eq('salonId', args.salonId).eq('lineUserName', searchTerm)
      )
      .collect()

    // 結果を結合して重複を排除
    const allResults = [...nameResults, ...phoneResults, ...emailResults, ...lineResults]
    const uniqueResults = Array.from(new Map(allResults.map((item) => [item._id, item])).values())

    // 結果をソート
    const sortedResults = uniqueResults.sort((a, b) => {
      if (args.sort === 'asc') {
        return a._creationTime - b._creationTime
      }
      return b._creationTime - a._creationTime
    })

    // ページネーション用のデータ形式に変換
    const paginatedResults = {
      page: sortedResults.slice(0, args.paginationOpts.numItems),
      isDone: sortedResults.length <= args.paginationOpts.numItems,
      continueCursor:
        sortedResults.length > args.paginationOpts.numItems
          ? { numItems: args.paginationOpts.numItems, cursor: args.paginationOpts.numItems }
          : undefined,
    }

    return paginatedResults
  },
})

// LINE IDから顧客情報を取得
export const findByLineId = query({
  args: {
    salonId: v.id('salon'),
    lineId: v.string(),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true)
    validateRequired(args.salonId, 'salonId')
    return await ctx.db
      .query('customer')
      .withIndex('by_salon_line_id', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('lineId', args.lineId)
          .eq('isArchive', args.includeArchive || false)
      )
      .first()
  },
})

// 電話番号から顧客情報を取得
export const findByPhone = query({
  args: {
    salonId: v.id('salon'),
    phone: v.string(),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    validateRequired(args.salonId, 'salonId')
    return await ctx.db
      .query('customer')
      .withIndex('by_salon_phone', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('phone', args.phone)
          .eq('isArchive', args.includeArchive || false)
      )
      .first()
  },
})

// 名前での顧客検索（部分一致）
export const findByName = query({
  args: {
    salonId: v.id('salon'),
    searchName: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    validateRequired(args.salonId, 'salonId')
    return await ctx.db
      .query('customer')
      .withSearchIndex('search_searchble_text', (q) =>
        q.search('searchbleText', args.searchName).eq('salonId', args.salonId)
      )
      .paginate(args.paginationOpts)
  },
})

export const findByEmail = query({
  args: {
    salonId: v.id('salon'),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true)
    validateRequired(args.salonId, 'salonId')
    return await ctx.db
      .query('customer')
      .withIndex('by_salon_email', (q) => q.eq('salonId', args.salonId).eq('email', args.email))
      .first()
  },
})

export const listBySalonId = query({
  args: {
    salonId: v.id('salon'),
    searchTerm: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    validateRequired(args.salonId, 'salonId')

    // Create a query with the index
    let customerQuery = ctx.db
      .query('customer')
      .withIndex('by_salon_id', (q) => q.eq('salonId', args.salonId))

    // Apply isArchive filter as part of the main filter chain
    customerQuery = customerQuery.filter((q) =>
      q.eq(q.field('isArchive'), args.includeArchive || false)
    )

    // 検索語がある場合
    if (args.searchTerm && args.searchTerm.length > 0) {
      customerQuery = customerQuery.filter((q) => {
        const searchbleText = q.field('searchbleText')
        // 文字列が存在し、検索語を含むかどうかをチェック
        return q.neq(searchbleText, undefined)
        // 注意: ここでは完全な検索機能を実装できません
        // 実際には全文検索インデックスの使用を検討してください
      })
    }

    // Apply sorting and pagination
    return customerQuery.order(args.sort || 'desc').paginate(args.paginationOpts)
  },
})

export const completeCustomer = query({
  args: {
    customerId: v.id('customer'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    validateRequired(args.customerId, 'customerId')

    const customer = await ctx.db.get(args.customerId)

    if (!customer) {
      throw throwConvexError({
        callFunc: 'customer.core.query.completeCustomer',
        message: 'Customer not found',
        title: '顧客が見つかりません',
        severity: 'low',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          customerId: args.customerId,
        },
      })
    }

    const customerDetail = await ctx.db
      .query('customer_detail')
      .withIndex('by_customer_id', (q) => q.eq('customerId', args.customerId))
      .first()

    if (!customerDetail) {
      throw throwConvexError({
        callFunc: 'customer.core.query.completeCustomer',
        message: 'Customer detail not found',
        title: '顧客詳細が見つかりません',
        severity: 'low',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          customerId: args.customerId,
        },
      })
    }

    const customerPoints = await ctx.db
      .query('customer_points')
      .withIndex('by_customer_id', (q) => q.eq('customerId', args.customerId))
      .first()

    if (!customerPoints) {
      throw throwConvexError({
        callFunc: 'customer.core.query.completeCustomer',
        message: 'Customer points not found',
        title: '顧客ポイントが見つかりません',
        severity: 'low',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          customerId: args.customerId,
        },
      })
    }
    return {
      customer: excludeFields(customer, ['deletedAt', 'isArchive', 'salonId']),
      customerDetails: excludeFields(customerDetail, [
        '_creationTime',
        'deletedAt',
        'isArchive',
        'customerId',
      ]),
      customerPoints: excludeFields(customerPoints, [
        '_creationTime',
        'deletedAt',
        'isArchive',
        'customerId',
      ]),
    }
  },
})

export const findByAvailableStaffs = query({
  args: {
    salonId: v.id('salon'),
    menuIds: v.array(v.id('menu')),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    validateRequired(args.salonId, 'salonId')

    // 1. 全スタッフ取得（アクティブかつアーカイブされていない）
    const allStaff = await ctx.db
      .query('staff')
      .withIndex('by_salon_id', (q) =>
        q.eq('salonId', args.salonId).eq('isActive', true).eq('isArchive', false)
      )
      .collect()

    // 2. 各メニューに対応しないスタッフ（除外スタッフ）を取得して集約
    const excludedIds = new Set<string>()
    for (const menuId of args.menuIds) {
      const exclusions = await ctx.db
        .query('menu_exclusion_staff')
        .withIndex('by_salon_menu_id', (q) =>
          q.eq('salonId', args.salonId).eq('menuId', menuId).eq('isArchive', false)
        )
        .collect()
      exclusions.forEach((ex) => excludedIds.add(ex.staffId))
    }

    // 3. 除外されたスタッフを除去
    const availableStaff = allStaff.filter((staff) => !excludedIds.has(staff._id))

    // 4. スタッフ設定を取得してマッピング (指名料、優先度)
    const configs = await ctx.db
      .query('staff_config')
      .withIndex('by_salon_id', (q) =>
        q.eq('salonId', args.salonId).eq('isArchive', false)
      )
      .collect()
    const configMap = new Map(configs.map((config) => [config.staffId, config]))

    // 5. 結果を整形して返却
    return availableStaff.map((staff) => {
      const config = configMap.get(staff._id)
      return {
        _id: staff._id,
        name: staff.name,
        age: staff.age,
        email: staff.email,
        gender: staff.gender,
        description: staff.description,
        imgPath: staff.imgPath,
        extraCharge: config?.extraCharge,
        priority: config?.priority,
      }
    })
  },
})

// const getAvailableStaffForAllMenus = async () => {
//   setIsLoadingStaff(true)
//   try {
//     // 最初のメニューに対応するスタッフを取得
//     const firstMenuStaffs = (await fetchQuery(api.staff.core.query.findAvailableStaffByMenu, {
//       salonId: salonId,
//       menuId: selectedMenus[0].menuId,
//     })) as AvailableStaff[]

//     if (selectedMenus.length === 1) {
//       // 単一メニューの場合はそのまま設定
//       setAvailableStaff(firstMenuStaffs)
//     } else {
//       // 複数メニューの場合は、各メニューに対応するスタッフを取得して共通するスタッフを抽出
//       let eligibleStaff = [...firstMenuStaffs]

//       // 2番目以降のメニューについてループ
//       for (let i = 1; i < selectedMenus.length; i++) {
//         const menuId = selectedMenus[i].menuId
//         const menuStaffs = (await fetchQuery(api.staff.core.query.findAvailableStaffByMenu, {
//           salonId: salonId,
//           menuId: menuId,
//         })) as AvailableStaff[]

//         // 共通するスタッフのみをフィルタリング
//         eligibleStaff = eligibleStaff.filter((staff) =>
//           menuStaffs.some((menuStaff) => menuStaff._id === staff._id)
//         )

//         // 共通するスタッフがいない場合は早期リターン
//         if (eligibleStaff.length === 0) break
//       }

//       setAvailableStaff(eligibleStaff)
//     }
//   } catch (error) {
//     toast.error(handleErrorToMsg(error))
//     setAvailableStaff([])
//   } finally {
//     setIsLoadingStaff(false)
//   }
// }

