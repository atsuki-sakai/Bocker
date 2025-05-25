// convex/webhook_queue/action.enqueueStripeEvent.ts
import { action } from '../_generated/server';
import { api } from '../_generated/api';
import { v } from 'convex/values';

/**
 * Stripe Webhook イベントをキューに入れ、非同期処理のために Worker に渡します。
 *
 * @param id - イベントの一意なID (Stripe イベントIDなど)
 * @param type - イベントタイプ (例: 'customer.subscription.created')
 * @param target - イベントのターゲット ('subscription' または 'connect')
 * @param payload - Webhook イベントのペイロード (Stripe.Event オブジェクトの JSON 文字列など)
 */
export const enqueueStripeEvent = action({
  args: {
    id: v.string(),      // Stripe イベント ID (例: evt_xxxx)
    type: v.string(),    // イベントタイプ (例: customer.subscription.updated)
    target: v.string(),  // 'subscription' または 'connect'
    payload: v.any(),    // Stripe.Event オブジェクト (JSONとして渡されることを想定)
  },
  handler: async (ctx, args) => {
    console.log(`[Action: enqueueStripeEvent] Queuing event ${args.id} (${args.type}) for target ${args.target}`);
    
    // Worker をスケジュールしてイベントを非同期処理
    // args をそのまま processStripeEvent Worker に渡す
    await ctx.scheduler.runAfter(0, api.webhook_worker.processStripeEvent, {
      id: args.id,
      type: args.type,
      target: args.target,
      payload: args.payload, // payload は Stripe.Event オブジェクトを想定
    });

    console.log(`[Action: enqueueStripeEvent] Event ${args.id} successfully scheduled.`);
    // この Action は API ルートから呼び出されることを想定しているため、
    // 成功した旨を示す値を返すこともできる (例: { success: true })
    return { success: true, message: `Event ${args.id} scheduled for processing.` };
  },
});
