import { mutation, query } from './../_generated/server';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { removeEmptyFields, trashRecord, KillRecord, authCheck } from './../helpers';
import { paginationOptsValidator } from 'convex/server';
import { CONVEX_ERROR_CODES } from './../constants';
import { validateCustomer } from './../validators';

// 顧客の追加
export const add = mutation({
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
    authCheck(ctx);
    validateCustomer(args);
    // サロンの存在確認
    const salon = await ctx.db.get(args.salonId);
    if (!salon) {
      console.error('AddCustomer: 指定されたサロンが存在しません', { ...args });
      throw new ConvexError({
        message: '指定されたサロンが存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        context: {
          salonId: args.salonId,
        },
      });
    }

    // fullNameが指定されていない場合は自動生成
    const fullName = [args.lastName, args.firstName, args.lineUserName].filter(Boolean).join(' ');

    validateCustomer({ ...args, fullName: fullName });
    const customerId = await ctx.db.insert('customer', {
      ...args,
      fullName: fullName,
      isArchive: false,
    });
    return customerId;
  },
});

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
    authCheck(ctx);
    validateCustomer(args);
    // 顧客の存在確認
    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.isArchive) {
      console.error('UpdateCustomer: 指定された顧客が存在しません', { ...args });
      throw new ConvexError({
        message: '指定された顧客が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        context: {
          customerId: args.customerId,
        },
      });
    }

    const updateData = removeEmptyFields(args);
    // customerId はパッチ対象から削除する
    delete updateData.customerId;

    // fullNameを更新
    if (
      updateData.firstName !== undefined ||
      updateData.lastName !== undefined ||
      updateData.lineUserName !== undefined
    ) {
      const firstName =
        updateData.firstName !== undefined ? updateData.firstName : customer.firstName;
      const lastName = updateData.lastName !== undefined ? updateData.lastName : customer.lastName;
      const lineUserName =
        updateData.lineUserName !== undefined ? updateData.lineUserName : customer.lineUserName;

      const fullName = [lastName, firstName, lineUserName].filter(Boolean).join(' ');

      updateData.fullName = fullName;
    }

    const newCustomerId = await ctx.db.patch(args.customerId, updateData);
    return newCustomerId;
  },
});

// 顧客の削除
export const trash = mutation({
  args: {
    customerId: v.id('customer'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    // 顧客の存在確認
    const customer = await ctx.db.get(args.customerId);
    if (!customer) {
      console.error('TrashCustomer: 指定された顧客が存在しません', { ...args });
      throw new ConvexError({
        message: '指定された顧客が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        context: {
          customerId: args.customerId,
        },
      });
    }

    // 顧客詳細情報の削除
    const customerDetail = await ctx.db
      .query('customer_detail')
      .withIndex('by_customer_id', (q) => q.eq('customerId', args.customerId))
      .first();
    if (!customerDetail) {
      console.error('DeleteCustomer: 指定された顧客の詳細が存在しません', { ...args });
      throw new ConvexError({
        message: '指定された顧客の詳細が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        context: {
          customerId: args.customerId,
        },
      });
    }
    await trashRecord(ctx, customer._id);
    await trashRecord(ctx, customerDetail._id);
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
    authCheck(ctx);
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
      const updateData = removeEmptyFields(args);
      delete updateData.customerId;
      return await ctx.db.patch(existingCustomer._id, {
        ...updateData,
        fullName: fullName,
      });
    }
  },
});

export const kill = mutation({
  args: {
    customerId: v.id('customer'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.isArchive) {
      console.error('DeleteCustomer: 指定された顧客が存在しません', { ...args });
      throw new ConvexError({
        message: '指定された顧客が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        context: {
          customerId: args.customerId,
        },
      });
    }

    await KillRecord(ctx, args.customerId);
  },
});

// サロンIDから顧客一覧を取得
export const getBySalonId = query({
  args: {
    salonId: v.id('salon'),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db
      .query('customer')
      .withIndex('by_salon_id', (q) => q.eq('salonId', args.salonId).eq('isArchive', false))
      .paginate(args.paginationOpts);
  },
});

// LINE IDから顧客情報を取得
export const getByLineId = query({
  args: {
    salonId: v.id('salon'),
    lineId: v.string(),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db
      .query('customer')
      .withIndex('by_salon_line_id', (q) =>
        q.eq('salonId', args.salonId).eq('lineId', args.lineId).eq('isArchive', false)
      )
      .first();
  },
});

// 電話番号から顧客情報を取得
export const getByPhone = query({
  args: {
    salonId: v.id('salon'),
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db
      .query('customer')
      .withIndex('by_salon_phone', (q) =>
        q.eq('salonId', args.salonId).eq('phone', args.phone).eq('isArchive', false)
      )
      .first();
  },
});

// 名前での顧客検索
export const searchByName = query({
  args: {
    salonId: v.id('salon'),
    searchName: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    const result = await ctx.db
      .query('customer')
      .withIndex('by_salon_id_full_name', (q) => q.eq('salonId', args.salonId))
      .filter((q) => q.eq(q.field('fullName'), args.searchName))
      .paginate(args.paginationOpts);

    return result;
  },
});

export const customersBySalonId = query({
  args: {
    salonId: v.id('salon'),
    paginationOpts: paginationOptsValidator,
    direction: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db
      .query('customer')
      .withIndex('by_salon_id', (q) => q.eq('salonId', args.salonId).eq('isArchive', false))
      .order(args.direction === 'asc' ? 'asc' : 'desc')
      .paginate(args.paginationOpts);
  },
});
