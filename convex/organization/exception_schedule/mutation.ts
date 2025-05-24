import { mutation } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants';
import { createRecord, archiveRecord, updateRecord, killRecord } from '@/convex/utils/helpers';
import {
  validateRequired,
  validateStringLength,
  validateDateStrFormat,
} from '@/convex/utils/validations';
import { checkAuth } from '@/convex/utils/auth';
import { ExceptionScheduleType, dayOfWeekType } from '@/convex/types';
import { MAX_NOTES_LENGTH } from '@/convex/constants';
import { excludeFields } from '@/convex/utils/helpers';

// サロンスケジュール例外の追加
export const create = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.string(),
    type: ExceptionScheduleType,
    week: dayOfWeekType,
    date: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.org_id, 'org_id');
    validateDateStrFormat(args.date, 'date');
    validateStringLength(args.notes, 'notes', MAX_NOTES_LENGTH);
    // 組織の存在確認
    const org = await ctx.db.query('organization')
    .withIndex('by_tenant_org_archive', q => 
      q.eq('tenant_id', args.tenant_id)
       .eq('org_id', args.org_id)
       .eq('is_archive', false)
    )
    .first();
    if (!org) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'schedule.org_exception_day.create',
        message: '指定された組織が存在しません',
        code: 'NOT_FOUND',
        status: 404,
        details: { ...args },
      });
    }

    return await createRecord(ctx, 'exception_schedule', {
      ...args,
    });
  },
});

// サロンスケジュール例外の更新
export const update = mutation({
  args: {
    exceptionScheduleId: v.id('exception_schedule'),
    type: ExceptionScheduleType,
    week: dayOfWeekType,
    date: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.exceptionScheduleId, 'exceptionScheduleId');
    validateDateStrFormat(args.date, 'date');
    validateStringLength(args.notes, 'notes', MAX_NOTES_LENGTH);
    // サロンスケジュール例外の存在確認
    const exceptionSchedule = await ctx.db.get(args.exceptionScheduleId);
    if (!exceptionSchedule) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'schedule.org_exception_day.update',
        message: '指定された組織スケジュール例外が存在しません',
        code: 'NOT_FOUND',
        status: 404,
        details: { ...args },
      });
    }

    const updateData = excludeFields(args, ['exceptionScheduleId']);
    return await updateRecord(ctx, args.exceptionScheduleId, updateData);
  },
});

// サロンスケジュール例外の削除
export const archive = mutation({
  args: {
    exceptionScheduleId: v.id('exception_schedule'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    return await archiveRecord(ctx, args.exceptionScheduleId);
  },
});

export const kill = mutation({
  args: {
    exceptionScheduleId: v.id('exception_schedule'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.exceptionScheduleId, 'exceptionScheduleId');
    return await killRecord(ctx, args.exceptionScheduleId);
  },
});

export const upsert = mutation({
  args: {
    exceptionScheduleId: v.id('exception_schedule'),
    tenant_id: v.id('tenant'),
    org_id: v.string(),
    type: ExceptionScheduleType,
    week: dayOfWeekType,
    date: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.org_id, 'org_id');
    validateDateStrFormat(args.date, 'date');
    validateStringLength(args.notes, 'notes', MAX_NOTES_LENGTH)
    // まずテナントと組織IDのクエリを作成
    let query = ctx.db
      .query('exception_schedule')
      .withIndex('by_tenant_org_archive', (q) => q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('is_archive', false));

    // 結果を絞り込み
    const allExistingExceptions = await query.collect();

    // 日付とタイプでフィルタリング（タイプはundefinedの可能性もあるため、JavaScriptフィルタを使用）
    const existingExceptions = allExistingExceptions.filter(
      (ex) => ex.date === args.date && ex.type === args.type
    );

    console.log('既存レコード:', existingExceptions);

    if (existingExceptions.length === 0) {
      // 新規作成
      console.log('新規作成します');
      return await createRecord(ctx, 'exception_schedule', {
        ...args,
      });
    } else {
      // 既存レコードを更新（最初のレコードを使用）
      const existingRecord = existingExceptions[0];
      console.log('更新します。ID:', existingRecord._id);

      // 更新データの準備
      const updateData = excludeFields(args, ['exceptionScheduleId']);
      return await updateRecord(ctx, existingRecord._id, updateData);
    }
  },
});
