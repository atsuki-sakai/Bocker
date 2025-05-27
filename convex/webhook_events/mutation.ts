import { mutation } from '../_generated/server';
import { v } from 'convex/values';
import { validateStringLength, validateRequired } from '@/convex/utils/validations';
import { ConvexError } from 'convex/values';
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants';
import { createRecord } from '@/convex/utils/helpers';
import { webhookEventProcessingResultType } from '@/convex/types';

/**
 * Stripe Webhook イベント管理用mutation
 * 冪等性を確保するためのイベント記録・チェック機能
 */

/**
 * イベントが既に処理済みかチェック
 */
export const checkProcessedEvent = mutation({
  args: {
    event_id: v.string(),
  },
  handler: async (ctx, args) => {
    validateStringLength(args.event_id, 'event_id');

    const existingEvent = await ctx.db
      .query('webhook_events')
      .withIndex('by_event_id', (q) => q.eq('event_id', args.event_id))
      .first();

    return {
      isProcessed: !!existingEvent,
      result: existingEvent?.processing_result,
      processedAt: existingEvent?.processed_at,
      errorMessage: existingEvent?.error_message,
    };
  },
});

/**
 * イベント処理記録を保存
 */
export const recordEvent = mutation({
  args: {
    event_id: v.string(),
    event_type: v.string(),
    processing_result: webhookEventProcessingResultType,
    error_message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    validateStringLength(args.event_id, 'event_id');
    validateStringLength(args.event_type, 'event_type');
    validateStringLength(args.processing_result, 'processing_result');

    // 重複チェック
    const existingEvent = await ctx.db
      .query('webhook_events')
      .withIndex('by_event_id', (q) => q.eq('event_id', args.event_id))
      .first();

    if (existingEvent) {
      // 既に処理済みの場合はスキップ（冪等性保証）
      return {
        success: true,
        alreadyProcessed: true,
        eventId: existingEvent._id,
      };
    }

    // 新規イベントを記録
    const eventId = await createRecord(ctx, 'webhook_events', {
      event_id: args.event_id,
      event_type: args.event_type,
      processed_at: Date.now(),
      processing_result: args.processing_result,
      error_message: args.error_message,
    });

    return {
      success: true,
      alreadyProcessed: false,
      eventId,
    };
  },
});

/**
 * イベント処理結果を更新（エラー時など）
 */
export const updateEventResult = mutation({
  args: {
    event_id: v.string(),
    processing_result: webhookEventProcessingResultType,
    error_message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    validateStringLength(args.event_id, 'event_id');
    validateStringLength(args.processing_result, 'processing_result');

    const event = await ctx.db
      .query('webhook_events')
      .withIndex('by_event_id', (q) => q.eq('event_id', args.event_id))
      .first();

    if (!event) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'stripe.webhook_events.updateEventResult',
        message: 'Webhook イベントが見つかりません',
        code: 'NOT_FOUND',
        status: 404,
        details: args,
      });
    }

    await ctx.db.patch(event._id, {
      processing_result: args.processing_result,
      error_message: args.error_message,
      updated_at: Date.now(),
    });

    return {
      success: true,
      eventId: event._id,
    };
  },
});

