import { mutation } from '@/convex/_generated/server';
import { v } from 'convex/values';
import {
  removeEmptyFields,
  archiveRecord,
  killRecord,
} from '@/services/convex/shared/utils/helper';
import { validateCustomer, validateRequired } from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { ConvexCustomError } from '@/services/convex/shared/utils/error';

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
    checkAuth(ctx);
    validateCustomer(args);
    // サロンの存在確認
    const salon = await ctx.db.get(args.salonId);
    if (!salon) {
      const err = new ConvexCustomError('low', '指定されたサロンが存在しません', 'NOT_FOUND', 404, {
        ...args,
      });
      throw err;
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
    checkAuth(ctx);
    validateCustomer(args);
    // 顧客の存在確認
    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.isArchive) {
      const err = new ConvexCustomError('low', '指定された顧客が存在しません', 'NOT_FOUND', 404, {
        ...args,
      });
      throw err;
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
export const archive = mutation({
  args: {
    customerId: v.id('customer'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    // 顧客の存在確認
    const customer = await ctx.db.get(args.customerId);
    if (!customer) {
      const err = new ConvexCustomError('low', '指定された顧客が存在しません', 'NOT_FOUND', 404, {
        ...args,
      });
      throw err;
    }

    // 顧客詳細情報の削除
    const customerDetail = await ctx.db
      .query('customer_detail')
      .withIndex('by_customer_id', (q) => q.eq('customerId', args.customerId))
      .first();
    if (!customerDetail) {
      const err = new ConvexCustomError(
        'low',
        '指定された顧客の詳細が存在しません',
        'NOT_FOUND',
        404,
        {
          ...args,
        }
      );
      throw err;
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
    checkAuth(ctx);
    validateRequired(args.customerId, 'customerId');

    await killRecord(ctx, args.customerId);
  },
});
