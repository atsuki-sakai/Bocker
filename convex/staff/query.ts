import { dayOfWeekType, imageType, genderType } from '@/convex/types'
import { query } from '@/convex/_generated/server'
import { v } from 'convex/values'
import { paginationOptsValidator } from 'convex/server'
import { checkAuth } from '@/convex/utils/auth'
import { ConvexError } from 'convex/values'
import { ERROR_SEVERITY, ERROR_STATUS_CODE } from '@/lib/errors/constants'


// スタッフIDからスタッフを取得
export const getById = query({
  args: {   
    id: v.id('staff'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    const staff = await ctx.db.get(args.id)
    if (!staff) {
      throw new ConvexError({
        message: '指定されたスタッフが存在しません',
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'staff.getById',
        code: 'NOT_FOUND',
        status: ERROR_STATUS_CODE.NOT_FOUND,
        details: { ...args },
      })
    }
    return staff
  },
})

// テナントIDと組織IDからスタッフ一覧を取得
export const list = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true)
    return await ctx.db
      .query('staff')
      .withIndex('by_tenant_org_active_archive', (q) =>
        q
          .eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
      )
      .filter((q) => q.eq(q.field('is_archive'), false))
      .order(args.sort ?? 'desc')
      .paginate(args.paginationOpts)
  },
})



// テナントIDと組織IDとメールアドレスでスタッフを検索
export const findByEmail = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    return await ctx.db
      .query('staff')
      .withIndex('by_tenant_org_active_archive', (q) =>
        q
          .eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
      )
      .filter((q) => q.eq(q.field('email'), args.email))
      .filter((q) => q.eq(q.field('is_archive'), false))
      .first()
  },
})

// 関連するテーブルの取得
export const getRelatedTables = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    staff_id: v.id('staff'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    // staffの取得にもisArchiveチェックを追加
    const staff = await ctx.db.get(args.staff_id)
    if (!staff) {
      throw new ConvexError({
        message: '指定されたスタッフが存在しません',
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'staff.getRelatedTables',
        code: 'NOT_FOUND',
        status: ERROR_STATUS_CODE.NOT_FOUND,
        details: { ...args },
      })
    }

    // 残りのデータを並列で取得
    const [staff_config, staff_auth] = await Promise.all([
      ctx.db
        .query('staff_config')
        .withIndex('by_tenant_org_staff_archive', (q) =>
          q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('staff_id', args.staff_id).eq('is_archive', false)
        )
        .first(),
      ctx.db
        .query('staff_auth')
        .withIndex('by_tenant_org_staff_archive', (q) =>
          q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('staff_id', args.staff_id).eq('is_archive', false)
        )
        .first(),
    ])

    if (!staff_config) {
      throw new ConvexError({
        message: '指定されたスタッフの設定が存在しません',
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'staff.getRelatedTables',
        code: 'NOT_FOUND',
        status: ERROR_STATUS_CODE.NOT_FOUND,
        details: { ...args },
      })
    }

    if (!staff_auth) {
      throw new ConvexError({
        message: '指定されたスタッフの認証情報が存在しません',
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'staff.getRelatedTables',
        code: 'NOT_FOUND',
        status: ERROR_STATUS_CODE.NOT_FOUND,
        details: { ...args },
      })
    }

    return {
      tenant_id: staff.tenant_id,
      org_id: staff.org_id,
      staff_id: staff._id,
      name: staff.name,
      age: staff.age,
      email: staff.email,
      instagram_link: staff.instagram_link,
      gender: staff.gender,
      description: staff.description,
      images: staff.images ? [
        ...staff.images.map((image) => ({
          original_url: image.original_url,
          thumbnail_url: image.thumbnail_url,
        })),
      ] : [],
      is_active: staff.is_active,
      tags: staff.tags,
      staff_auth_id: staff_auth._id,
      role: staff_auth.role,
      staff_config_id: staff_config._id,
      extra_charge: staff_config.extra_charge,
      priority: staff_config.priority,
      pin_code: staff_auth.pin_code,
      _creationTime: staff._creationTime,
    }
  },
})

export const findAvailableStaffByMenu = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    menu_id: v.id('menu'),
  },
  returns: v.array(
    v.object({
      _id: v.id('staff'),
      name: v.optional(v.string()),
      age: v.optional(v.number()),
      email: v.optional(v.string()),
      gender: v.optional(genderType),
      description: v.optional(v.string()),
      images: v.optional(v.array(imageType)),
      extra_charge: v.optional(v.number()),
      priority: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    // 1. 全スタッフ取得
    const allStaff = await ctx.db
      .query('staff')
      .withIndex('by_tenant_org_active_archive', (q) =>
        q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('is_active', true).eq('is_archive', false)
      )
      .collect()
    // 2. 除外スタッフ取得
    const exclusions = await ctx.db
      .query('menu_exclusion_staff')
      .withIndex('by_tenant_org_menu_archive', (q) =>
        q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('menu_id', args.menu_id).eq('is_archive', false)
      )
      .collect()
    const excludedIds = new Set(exclusions.map((r) => r.staff_id))
    // 3. 有効スタッフフィルタ
    const availableStaff = allStaff.filter((staff) => !excludedIds.has(staff._id))
    // 4. 一度に staff_config を取得し、マッピング
    const configs = await ctx.db
      .query('staff_config')
      .withIndex('by_tenant_org_staff_archive', q =>
        q
          .eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
      )
      .filter((q) => q.eq(q.field('is_archive'), false))
      .collect()

    const filteredConfigs = configs.filter((config) => availableStaff.map((staff) => staff._id).includes(config.staff_id))

    const configMap = new Map(filteredConfigs.map((config) => [config.staff_id, config]))

    // 5. 結果作成
    const result = availableStaff.map((staff) => {
      const config = configMap.get(staff._id)
      return {
        _id: staff._id,
        name: staff.name,
        age: staff.age,
        email: staff.email,
        gender: staff.gender,
        description: staff.description,
        images: staff.images ? [
          ...staff.images.map((image) => ({
            original_url: image.original_url,
            thumbnail_url: image.thumbnail_url,
          })),
        ] : [],
        extra_charge: config?.extra_charge,
        priority: config?.priority,
      }
    })
    return result
  },
})

export const findSchedule = query({
  args: {
    staff_id: v.id('staff'),
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    day_of_week: dayOfWeekType,
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true)
    const staffSchedules = await ctx.db
      .query('staff_exception_schedule')
      .withIndex('by_tenant_org_staff_date_archive', (q) =>
        q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('staff_id', args.staff_id)
      ).filter((q) => q.eq(q.field('is_archive'), false))
      .collect()
    const weekSchedule = await ctx.db
      .query('staff_week_schedule')
      .withIndex('by_tenant_org_staff_week_open_archive', (q) =>
        q
          .eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
          .eq('staff_id', args.staff_id)
          .eq('day_of_week', args.day_of_week)
      )
      .filter((q) => q.eq(q.field('is_archive'), false))
      .first()
    return {
      schedules: staffSchedules
        .sort((a, b) => (a.start_time_unix ?? 0) - (b.start_time_unix ?? 0))
        .map((schedule) => ({
          type: schedule.type,
          date: schedule.date,
          start_time_unix: schedule.start_time_unix,
          end_time_unix: schedule.end_time_unix,
          is_all_day: schedule.is_all_day ?? false,
        })),
      week: {
        day_of_week: weekSchedule?.day_of_week,
        is_open: weekSchedule?.is_open,
        start_hour: weekSchedule?.start_hour,
        end_hour: weekSchedule?.end_hour,
      },
    }
  },
})

export const listDisplayData = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization')
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true)
    const staffs = await ctx.db
        .query('staff')
        .withIndex('by_tenant_org_active_archive', (q) =>
          q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('is_active', true).eq('is_archive', false)
        )
        .collect()
    console.log('staffs', staffs)
    const staffConfigs = await ctx.db
      .query('staff_config')
      .withIndex('by_tenant_org_staff_archive', (q) => q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id))
      .filter((q) => q.eq(q.field('is_archive'), false))
      .collect()
    return staffs.map((staff) => ({
      _id: staff._id,
      name: staff.name,
      age: staff.age,
      email: staff.email,
      instagram_link: staff.instagram_link,
      gender: staff.gender,
      description: staff.description,
      images: staff.images ? [
        ...staff.images.map((image) => ({
          original_url: image.original_url,
          thumbnail_url: image.thumbnail_url,
        })),
      ] : [],
      is_active: staff.is_active,
      tags: staff.tags,
      _creationTime: staff._creationTime,
      extra_charge: staffConfigs.find((config) => config.staff_id === staff._id)?.extra_charge,
      priority: staffConfigs.find((config) => config.staff_id === staff._id)?.priority,
      featured_hair_images: staff.featured_hair_images ? [
        ...staff.featured_hair_images.map((image) => ({
          original_url: image.original_url,
          thumbnail_url: image.thumbnail_url,
        })),
      ] : [],
    }))
  },
})

export const findByAvailableStaffs = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    menu_ids: v.array(v.id('menu')),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true)

    // 1. 全スタッフ取得（アクティブかつアーカイブされていない）
    const allStaff = await ctx.db
      .query('staff')
      .withIndex('by_tenant_org_active_archive', (q) =>
        q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('is_active', true).eq('is_archive', false)
      )
      .collect()

    // 2. 各メニューに対応しないスタッフ（除外スタッフ）を取得して集約
    const excludedIds = new Set<string>()
    for (const menu_id of args.menu_ids) {
      const exclusions = await ctx.db
        .query('menu_exclusion_staff')
        .withIndex('by_tenant_org_menu_archive', (q) =>
          q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('menu_id', menu_id).eq('is_archive', false)
        )
        .collect()
      exclusions.forEach((ex) => excludedIds.add(ex.staff_id))
    }

    // 3. 除外されたスタッフを除去
    const availableStaff = allStaff.filter((staff) => !excludedIds.has(staff._id))

    // 4. スタッフ設定を取得してマッピング (指名料、優先度)
    const configs = await ctx.db
      .query('staff_config')
      .withIndex('by_tenant_org_staff_archive', (q) => q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id))
      .filter((q) => q.eq(q.field('is_archive'), false))
      .collect()
    const configMap = new Map(configs.map((config) => [config.staff_id, config]))

    // 5. weekScheduleを取得
    const availableStaffWeekSchedules = await Promise.all(availableStaff.map(async (staff) => {
      const weekSchedules = await ctx.db
        .query('staff_week_schedule')
        .withIndex('by_tenant_org_staff_week_open_archive', (q) =>
          q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('staff_id', staff._id)
        )
        .filter((q) => q.eq(q.field('is_archive'), false))
        .collect()
      return {
        staff_id: staff._id,
        week_schedules: weekSchedules,
      }
    }));

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
        images: staff.images ? [
          ...staff.images.map((image) => ({
            original_url: image.original_url,
            thumbnail_url: image.thumbnail_url,
          })),
        ] : [],
        is_active: staff.is_active,
        tags: staff.tags,
        _creationTime: staff._creationTime,
        instagram_link: staff.instagram_link,
        featured_hair_images: staff.featured_hair_images ? [
          ...staff.featured_hair_images.map((image) => ({
            original_url: image.original_url,
            thumbnail_url: image.thumbnail_url,
          })),
        ] : [],
        extra_charge: config?.extra_charge,
        priority: config?.priority,
        week_schedules: availableStaffWeekSchedules.find((schedule) => schedule.staff_id === staff._id)?.week_schedules,
      }
    })
  },
})
