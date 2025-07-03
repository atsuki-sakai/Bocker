import { query } from '@/convex/_generated/server'
import { v } from 'convex/values'
import { getPlanLimits } from '@/convex/utils/helpers'
import { ConvexError } from 'convex/values'
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants'
import { SubscriptionPlanName, limitType } from '@/convex/types'

export const checkLimitByPlan = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    limit_type: limitType,
  },
  handler: async (ctx, args) => {

    // 1. テナントのサブスクリプションを取得
    const subscription = await ctx.db.query('subscription').withIndex('by_tenant_archive', (q) =>
      q.eq('tenant_id', args.tenant_id)
    ).first();

    if (!subscription) {
        throw new ConvexError({
            statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
            severity: ERROR_SEVERITY.ERROR,
            callFunc: 'tenant.plan.query.checkLimitByPlan',
            message: 'サブスクリプションが見つかりません。',
            code: 'BAD_REQUEST',
            details: {
                tenantId: args.tenant_id,
                orgId: args.org_id,
            }
        });
    }
    
    // デバッグ出力: サブスクリプション情報
    console.log('[DEBUG] checkLimitByPlan - Subscription info:', {
      tenant_id: args.tenant_id,
      org_id: args.org_id,
      plan_name: subscription.plan_name,
      limit_type: args.limit_type,
      subscription_id: subscription._id,
    });
    
    // 2. サブスクリプションのプランから制限を取得
    const limits = getPlanLimits(subscription.plan_name as SubscriptionPlanName);
    
    // デバッグ出力: プラン制限情報
    console.log('[DEBUG] checkLimitByPlan - Plan limits:', {
      plan_name: subscription.plan_name,
      limits: limits,
    });

    // 3. limit_typeに応じて制限を取得
    switch (args.limit_type) {
      // スタッフの制限チェック
      case 'staff':
        const staffCount = await ctx.db
          .query('staff')
          .withIndex('by_tenant_org_active_archive', (q) =>
            q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id)
          ).filter((q) => q.eq(q.field('is_archive'), false))
          .take(limits.maxStaffCount + 1);
        if (staffCount.length >= limits.maxStaffCount) {
          throw new ConvexError({
            statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
            severity: ERROR_SEVERITY.ERROR,
            callFunc: 'staff.mutation.create',
            message: 'スタッフの最大登録数を超えています。',
          });
        }
        break;
      // メニューの制限チェック
      case 'menu':
        const menuCount = await ctx.db
          .query('menu')
          .withIndex('by_tenant_org_active_archive', (q) =>
            q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id)
          ).filter((q) => q.eq(q.field('is_archive'), false))
          .take(limits.maxMenuCount + 1);
          
        // デバッグ出力: メニューカウント情報
        console.log('[DEBUG] checkLimitByPlan - Menu count check:', {
          tenant_id: args.tenant_id,
          org_id: args.org_id,
          plan_name: subscription.plan_name,
          current_menu_count: menuCount.length,
          max_menu_count: limits.maxMenuCount,
          is_limit_exceeded: menuCount.length >= limits.maxMenuCount,
          actual_menus: menuCount.map(menu => ({ 
            id: menu._id, 
            name: menu.name, 
            is_archive: menu.is_archive 
          }))
        });
        
        if (menuCount.length >= limits.maxMenuCount) {
          console.log('[DEBUG] checkLimitByPlan - Menu limit exceeded!', {
            current_count: menuCount.length,
            max_count: limits.maxMenuCount,
            plan_name: subscription.plan_name
          });
          throw new ConvexError({
            statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
            severity: ERROR_SEVERITY.ERROR,
            callFunc: 'menu.core.create',
            message: 'メニューの最大登録数を超えています。',
          });
        }
        break;
      // オプションの制限チェック
      case 'option':
        const optionCount = await ctx.db
          .query('option')
          .withIndex('by_tenant_org_active_archive', (q) =>
            q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id)
          ).filter((q) => q.eq(q.field('is_archive'), false))
          .take(limits.maxOptionCount + 1);
        if (optionCount.length >= limits.maxOptionCount) {
          throw new ConvexError({
            statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
            severity: ERROR_SEVERITY.ERROR,
            callFunc: 'option.core.create',
            message: 'オプションの最大登録数を超えています。',
          });
        }
        break;
      case 'coupon':
        const couponCount = await ctx.db
          .query('coupon')
          .withIndex('by_tenant_org_archive', (q) =>
            q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id)
          ).filter((q) => q.eq(q.field('is_archive'), false))
          .take(limits.maxCouponCount + 1);
        if (couponCount.length >= limits.maxCouponCount) {
          throw new ConvexError({
            statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
            severity: ERROR_SEVERITY.ERROR,
            callFunc: 'coupon.core.create',
            message: 'クーポンの最大登録数を超えています。',
          });
        }
        break;
      // 予約の制限チェック（現在は無制限）
      case 'reservation':
        //　FIXME: 予約は月毎にリセットされるため、制限をカウントするテーブルを作成する必要がある
        // 現状は予約は無制限にしている
        break;
      default:
        throw new ConvexError({
          statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
          severity: ERROR_SEVERITY.ERROR,
          callFunc: 'tenant.plan.query.checkLimitByPlan',
          message: '無効なlimit_typeです。',
        });
    }
    
    // デバッグ出力: 制限チェック成功
    console.log('[DEBUG] checkLimitByPlan - Limit check passed successfully:', {
      tenant_id: args.tenant_id,
      org_id: args.org_id,
      limit_type: args.limit_type,
      plan_name: subscription.plan_name,
    });
    
    return true;
  },
})