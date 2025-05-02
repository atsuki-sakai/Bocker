import { mutation } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { excludeFields, archiveRecord, killRecord } from '@/services/convex/shared/utils/helper';
import { validateCustomer, validateRequired } from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { genderType } from '@/services/convex/shared/types/common';
import { throwConvexError } from '@/lib/error';
// 顧客の追加
export const create = mutation({
  args: {
    salonId: v.id('salon'),
    lineId: v.optional(v.string()),
    lineUserName: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    lastReservationDate_unix: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true)
    validateCustomer(args)
    // サロンの存在確認
    const salon = await ctx.db.get(args.salonId)
    if (!salon) {
      throw throwConvexError({
        message: '指定されたサロンが存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定されたサロンが存在しません',
        callFunc: 'customer.create',
        severity: 'low',
        details: { ...args },
      })
    }

    const nameParts: string[] = []
    if (args.lastName?.trim()) nameParts.push(args.lastName.trim())
    if (args.firstName?.trim()) nameParts.push(args.firstName.trim())
    if (args.lineUserName?.trim()) nameParts.push(args.lineUserName.trim())

    // nameParts が空のときは lineUserName 優先、そうでなければ結合
    const fullName = nameParts.length > 0 ? nameParts.join(' ') : (args.lineUserName?.trim() ?? '')

    validateCustomer({ ...args, fullName })
    const customerId = await ctx.db.insert('customer', {
      ...args,
      fullName,
      isArchive: false,
    })
    return customerId
  },
})

// 顧客情報の更新
export const update = mutation({
  args: {
    customerId: v.id('customer'),
    lineId: v.optional(v.string()),
    lineUserName: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    fullName: v.optional(v.string()),
    lastReservationDate_unix: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true)
    validateCustomer(args)
    // 顧客の存在確認
    const customer = await ctx.db.get(args.customerId)
    if (!customer || customer.isArchive) {
      throw throwConvexError({
        message: '指定された顧客が存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定された顧客が存在しません',
        callFunc: 'customer.update',
        severity: 'low',
        details: { ...args },
      })
    }

    const updateData = excludeFields(args, ['customerId'])

    // fullNameを更新
    if (
      updateData.firstName !== undefined ||
      updateData.lastName !== undefined ||
      updateData.lineUserName !== undefined
    ) {
      const firstName =
        updateData.firstName !== undefined ? updateData.firstName : customer.firstName
      const lastName = updateData.lastName !== undefined ? updateData.lastName : customer.lastName
      const lineUserName =
        updateData.lineUserName !== undefined ? updateData.lineUserName : customer.lineUserName

      const nameParts: string[] = []
      if (lastName?.trim()) nameParts.push(lastName.trim())
      if (firstName?.trim()) nameParts.push(firstName.trim())
      if (lineUserName?.trim()) nameParts.push(lineUserName.trim())

      // nameParts が空のときは lineUserName 優先、そうでなければ結合
      const fullName = nameParts.length > 0 ? nameParts.join(' ') : (lineUserName?.trim() ?? '')

      updateData.fullName = fullName
    }

    const newCustomerId = await ctx.db.patch(args.customerId, updateData)
    return newCustomerId
  },
})

// 顧客の削除
export const archive = mutation({
  args: {
    customerId: v.id('customer'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    // 顧客の存在確認
    const customer = await ctx.db.get(args.customerId);
    if (!customer) {
      throw throwConvexError({
        message: '指定された顧客が存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定された顧客が存在しません',
        callFunc: 'customer.archive',
        severity: 'low',
        details: { ...args },
      });
    }

    // 顧客詳細情報の削除
    const customerDetail = await ctx.db
      .query('customer_detail')
      .withIndex('by_customer_id', (q) => q.eq('customerId', args.customerId))
      .first();
    if (!customerDetail) {
      throw throwConvexError({
        message: '指定された顧客の詳細が存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定された顧客の詳細が存在しません',
        callFunc: 'customer.archive',
        severity: 'low',
        details: { ...args },
      });
    }
    await archiveRecord(ctx, customer._id);
    await archiveRecord(ctx, customerDetail._id);
    return true;
  },
});

export const upsert = mutation({
  args: {
    customerId: v.id('customer'),
    salonId: v.id('salon'),
    lineId: v.optional(v.string()),
    lineUserName: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    lastReservationDate_unix: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateCustomer(args);
    const existingCustomer = await ctx.db.get(args.customerId);
    let fullName = '';

    if (!existingCustomer || existingCustomer.isArchive) {
      fullName = [args.lastName, args.firstName, args.lineUserName].filter(Boolean).join(' ');

      validateCustomer({ ...args, fullName: fullName });
      return await ctx.db.insert('customer', {
        ...args,
        fullName: fullName,
        isArchive: false,
      });
    } else {
      fullName =
        (args.lineUserName ?? existingCustomer.lineUserName) +
        ' ' +
        (args.lastName ? args.lastName : existingCustomer.lastName) +
        ' ' +
        (args.firstName ?? existingCustomer.firstName);
      validateCustomer({ ...args, fullName: fullName });
      const updateData = excludeFields(args, ['customerId']);
      return await ctx.db.patch(existingCustomer._id, {
        ...updateData,
        fullName: fullName,
      });
    }
  },
});

// 顧客の完全削除
export const killRelatedTables = mutation({
  args: {
    customerId: v.id('customer'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    validateRequired(args.customerId, 'customerId')

    await killRecord(ctx, args.customerId)
    const customerDetailId = await ctx.db
      .query('customer_detail')
      .withIndex('by_customer_id', (q) => q.eq('customerId', args.customerId))
      .first()
    if (!customerDetailId) {
      throw throwConvexError({
        message: '指定された顧客の詳細が存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定された顧客の詳細が存在しません',
        callFunc: 'customer.kill',
        severity: 'low',
        details: { ...args },
      })
    }
    await killRecord(ctx, customerDetailId._id)
    const customerPointsId = await ctx.db
      .query('customer_points')
      .withIndex('by_customer_id', (q) => q.eq('customerId', args.customerId))
      .first()
    if (!customerPointsId) {
      throw throwConvexError({
        message: '指定された顧客のポイントが存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定された顧客のポイントが存在しません',
        callFunc: 'customer.kill',
        severity: 'low',
        details: { ...args },
      })
    }
    await killRecord(ctx, customerPointsId._id)
    return true
  },
})

export const createCompleteFields = mutation({
  args: {
    salonId: v.id('salon'),
    lineId: v.optional(v.string()), // LINE ID
    lineUserName: v.optional(v.string()), // LINEユーザー名
    phone: v.optional(v.string()), // 電話番号
    email: v.optional(v.string()), // メールアドレス
    firstName: v.optional(v.string()), // 名前
    lastName: v.optional(v.string()), // 苗字
    useCount: v.optional(v.number()), // 利用回数
    lastReservationDate_unix: v.optional(v.number()), // 最終予約日
    tags: v.optional(v.array(v.string())), // タグ
    age: v.optional(v.number()), // 年齢
    birthday: v.optional(v.string()), // 誕生日
    gender: v.optional(genderType), // 性別
    notes: v.optional(v.string()), // メモ
    totalPoints: v.optional(v.number()), // ポイント
    lastTransactionDate_unix: v.optional(v.number()), // 最終トランザクション日
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateCustomer(args);

    try {
      const customerId = await ctx.db.insert('customer', {
        salonId: args.salonId, // サロンID
        lineId: args.lineId, // LINE ID
        lineUserName: args.lineUserName, // LINEユーザー名
        phone: args.phone, // 電話番号
        email: args.email, // メールアドレス
        firstName: args.firstName, // 名前
        lastName: args.lastName, // 苗字
        fullName: (args.lastName ?? '') + (args.firstName ?? '') + (args.lineUserName ?? ''), // 検索用フルネーム
        useCount: args.useCount, // 利用回数
        lastReservationDate_unix: args.lastReservationDate_unix, // 最終予約日
        tags: args.tags, // タグ
        isArchive: false,
      });

      await ctx.db.insert('customer_detail', {
        customerId: customerId,
        email: args.email, // メールアドレス
        age: args.age, // 年齢
        birthday: args.birthday, // 誕生日
        gender: args.gender, // 性別
        notes: args.notes, // メモ
        isArchive: false,
      });

      await ctx.db.insert('customer_points', {
        customerId: customerId,
        salonId: args.salonId,
        totalPoints: args.totalPoints, // ポイント
        lastTransactionDate_unix: undefined, // 最終トランザクション日
        isArchive: false,
      })
      return customerId;
    } catch (error) {
      console.error(error);
      throw error;
    }
  },
});

export const updateRelatedTables = mutation({
  args: {
    salonId: v.id('salon'), // サロンID
    customerId: v.id('customer'), // 顧客ID
    lineId: v.optional(v.string()), // LINE ID
    lineUserName: v.optional(v.string()), // LINEユーザー名
    phone: v.optional(v.string()), // 電話番号
    email: v.optional(v.string()), // メールアドレス
    firstName: v.optional(v.string()), // 名前
    lastName: v.optional(v.string()), // 苗字
    fullName: v.optional(v.string()), // 検索用フルネーム
    useCount: v.optional(v.number()), // 利用回数
    lastReservationDate_unix: v.optional(v.number()), // 最終予約日
    tags: v.optional(v.array(v.string())), // タグ
    age: v.optional(v.number()), // 年齢
    birthday: v.optional(v.string()), // 誕生日
    gender: v.optional(genderType), // 性別
    notes: v.optional(v.string()), // メモ
    totalPoints: v.optional(v.number()), // ポイント
    lastTransactionDate_unix: v.optional(v.number()), // 最終トランザクション日
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true)
    validateCustomer(args)

    try {
      const updateCustomerId = await ctx.db.patch(args.customerId, {
        salonId: args.salonId, // サロンID
        lineId: args.lineId, // LINE ID
        lineUserName: args.lineUserName, // LINEユーザー名
        phone: args.phone, // 電話番号
        email: args.email, // メールアドレス
        fullName: (args.lastName ?? '') + (args.firstName ?? '') + (args.lineUserName ?? ''), // 検索用フルネーム
        useCount: args.useCount, // 利用回数
        lastReservationDate_unix: args.lastReservationDate_unix, // 最終予約日
        tags: args.tags, // タグ
      })

      const updateCustomerDetailId = await ctx.db
        .query('customer_detail')
        .withIndex('by_customer_id', (q) => q.eq('customerId', args.customerId))
        .first()
      if (!updateCustomerDetailId) {
        throw throwConvexError({
          message: '指定された顧客の詳細が存在しません',
          status: 404,
          code: 'NOT_FOUND',
          title: '指定された顧客の詳細が存在しません',
          callFunc: 'customer.updateCompleteFields',
          severity: 'low',
          details: { ...args },
        })
      }
      await ctx.db.patch(updateCustomerDetailId._id, {
        email: args.email, // メールアドレス
        age: args.age, // 年齢
        birthday: args.birthday, // 誕生日
        gender: args.gender, // 性別
        notes: args.notes, // メモ
      })

      const updateCustomerPointsId = await ctx.db
        .query('customer_points')
        .withIndex('by_customer_id', (q) => q.eq('customerId', args.customerId))
        .first()
      if (!updateCustomerPointsId) {
        throw throwConvexError({
          message: '指定された顧客のポイントが存在しません',
          status: 404,
          code: 'NOT_FOUND',
          title: '指定された顧客のポイントが存在しません',
          callFunc: 'customer.updateCompleteFields',
          severity: 'low',
          details: { ...args },
        })
      }
      await ctx.db.patch(updateCustomerPointsId._id, {
        totalPoints: args.totalPoints, // ポイント
        lastTransactionDate_unix: args.lastTransactionDate_unix, // 最終トランザクション日
      })
      return updateCustomerId
    } catch (error) {
      console.error(error)
      throw error
    }
  },
})
