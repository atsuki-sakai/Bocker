import { mutation } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { createRecord, updateRecord, excludeFields, archiveRecord, killRecord } from '@/convex/utils/helpers';
import { validateRequired, validateStringLength, validateEmail, validateTags } from '@/convex/utils/validations';
import { checkAuth } from '@/convex/utils/auth';
import { ConvexError } from 'convex/values';
import { ERROR_SEVERITY, ERROR_STATUS_CODE } from '@/lib/errors/constants';
import { genderType, imageType } from '@/convex/types';
import { MAX_NOTES_LENGTH } from '../constants';

// スタッフの追加
export const create = mutation({
  args: {
    tenant_id: v.id('tenant'), // テナントID
    org_id: v.id('organization'), // 組織ID
    name: v.string(), // スタッフ名
    age: v.optional(v.number()), // 年齢
    email: v.string(), // メールアドレス
    gender: genderType, // 性別
    instagram_link: v.optional(v.string()), // インスタグラムリンク 
    description: v.optional(v.string()), // 自己紹介
    images: v.array(imageType), // 画像
    tags: v.array(v.string()), // タグ
    is_active: v.boolean(), // 有効/無効
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    validateRequired(args.name, 'name');
    validateEmail(args.email, 'email');
    validateRequired(args.gender, 'gender');
    validateStringLength(args.name, 'name');
    validateStringLength(args.description, 'description', MAX_NOTES_LENGTH);
    validateStringLength(args.instagram_link, 'instagram_link');
    validateTags(args.tags, 'tags');
    // スタッフの存在確認
    const existingStaff = await ctx.db
      .query('staff')
      .withIndex('by_tenant_org_active_archive', (q) =>
        q
          .eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
      ).filter((q) => q.eq(q.field('email'), args.email))
      .filter((q) => q.eq(q.field('is_archive'), false))
      .first()
    if (existingStaff) {
      throw new ConvexError({
        message: '指定されたメールアドレスのスタッフがすでに存在します',
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'staff.create',
        details: { ...existingStaff },
      })
    }
    return await createRecord(ctx, 'staff', args)
  },
})

// スタッフ情報の更新
export const update = mutation({
  args: {
    staff_id: v.id('staff'),
    name: v.optional(v.string()),
    age: v.optional(v.number()),
    email: v.optional(v.string()),
    instagram_link: v.optional(v.string()),
    gender: v.optional(genderType),
    description: v.optional(v.string()),
    images: v.optional(v.array(imageType)),
    is_active: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    validateRequired(args.name, 'name');
    validateEmail(args.email, 'email');
    validateRequired(args.gender, 'gender');
    validateStringLength(args.name, 'name');
    validateStringLength(args.description, 'description', MAX_NOTES_LENGTH);
    validateStringLength(args.instagram_link, 'instagram_link');
    validateTags(args.tags, 'tags');
    // スタッフの存在確認
    const staff = await ctx.db.get(args.staff_id)
    if (!staff || staff.is_archive) {
      throw new ConvexError({
        message: '指定されたスタッフが存在しません',
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'staff.update',
        details: { ...args },
      })
    }

    const updateData = excludeFields(args, ['staff_id'])

    return await updateRecord(ctx, args.staff_id, updateData)
  },
})

// スタッフの削除
export const archive = mutation({
  args: {
    staffId: v.id('staff'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    return await archiveRecord(ctx, args.staffId)
  },
})

export const upsert = mutation({
  args: {
    tenant_id: v.id('tenant'), // テナントID
    org_id: v.id('organization'), // 組織ID
    staff_id: v.id('staff'),
    name: v.string(), // スタッフ名
    age: v.optional(v.number()), // 年齢
    email: v.string(), // メールアドレス
    gender: genderType, // 性別
    instagram_link: v.optional(v.string()), // インスタグラムリンク 
    description: v.optional(v.string()), // 自己紹介
    images: v.array(imageType), // 画像
    tags: v.array(v.string()), // タグ
    is_active: v.boolean(), // 有効/無効
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    validateRequired(args.name, 'name');
    validateEmail(args.email, 'email');
    validateRequired(args.gender, 'gender');
    validateStringLength(args.name, 'name');
    validateStringLength(args.description, 'description', MAX_NOTES_LENGTH);
    validateStringLength(args.instagram_link, 'instagram_link');
    validateTags(args.tags, 'tags');
    const existingStaff = await ctx.db.get(args.staff_id)

    if (!existingStaff || existingStaff.is_archive) {
      return await createRecord(ctx, 'staff', args)
    } else {
      const updateData = excludeFields(args, ['staff_id', 'tenant_id', 'org_id'])
      return await updateRecord(ctx, existingStaff._id, updateData)
    }
  },
})

export const killRelatedTables = mutation({
  args: {
    tenant_id: v.id('tenant'), // テナントID
    org_id: v.id('organization'), // 組織ID
    staff_id: v.id('staff'),
    staff_config_id: v.id('staff_config'),
    staff_auth_id: v.id('staff_auth'),
  },
  handler: async (ctx, args) => {

    if (args.staff_config_id) {
      await killRecord(ctx, args.staff_config_id)
    }
    if (args.staff_auth_id) {
      await killRecord(ctx, args.staff_auth_id)
    }
    if (args.staff_id) {
      await killRecord(ctx, args.staff_id)
    }
    const staffWeekSchedules = await ctx.db
      .query('staff_week_schedule')
      .withIndex('by_tenant_org_staff_archive', (q) => q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('staff_id', args.staff_id))
      .collect()

    await Promise.all(staffWeekSchedules.map((schedule) => killRecord(ctx, schedule._id)))

    const staffSchedules = await ctx.db
      .query('staff_exception_schedule')
      .withIndex('by_tenant_org_staff_date_archive', (q) => q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('staff_id', args.staff_id))
      .collect()
    await Promise.all(staffSchedules.map((schedule) => killRecord(ctx, schedule._id)))
    return {
      deletedStaffConfigId: args.staff_config_id,
      deletedStaffAuthId: args.staff_auth_id,
      deletedStaffId: args.staff_id,
    }
  },
})

export const removeImages = mutation({
  args: {
    staff_id: v.id('staff'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    const staff = await ctx.db.get(args.staff_id)
    if (!staff) {
      throw new ConvexError({
        message: '指定されたスタッフが存在しません',
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'staff.removeImages',
        code: 'NOT_FOUND',
        status: ERROR_STATUS_CODE.NOT_FOUND,
        details: { ...args },
      })
    }
    const deletedStaffImage = await ctx.db.patch(args.staff_id, {
      images: [],
    })
    return {
      deletedStaffImage,
    }
  },
})
