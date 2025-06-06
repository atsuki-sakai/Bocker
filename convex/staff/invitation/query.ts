import { v } from 'convex/values';
import { query } from '../../_generated/server';

/**
 * 招待中スタッフ一覧
 * clerk_user_id が null のスタッフを取得
 */
export const listPending = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
  },
  handler: async (ctx, args) => {

    const pendingStaff = await ctx.db
      .query('staff')
      .withIndex('by_tenant_org_active_archive', (q) =>
        q.eq('tenant_id', args.tenant_id)
         .eq('org_id', args.org_id)
         .eq('is_active', false) // 招待中は非アクティブ
         .eq('is_archive', false)
      )
      .filter((q) => q.eq(q.field('clerk_user_id'), undefined))
      .collect();

    return pendingStaff;
  },
});

/**
 * 招待状態統合ビュー
 * 通常スタッフ + 招待中スタッフの統合データ
 */
export const getStaffWithInvitationStatus = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {

    // アクティブなスタッフを取得
    let staffQuery = ctx.db
      .query('staff')
      .withIndex('by_tenant_org_active_archive', (q) =>
        q.eq('tenant_id', args.tenant_id)
         .eq('org_id', args.org_id)
         .eq('is_active', args.includeInactive ?? true)
         .eq('is_archive', false)
      )

    const allStaff = await staffQuery.collect();

    // 招待状態を付与
    const staffWithStatus = allStaff.map(staff => ({
      ...staff,
      invitationStatus: staff.clerk_user_id ? 'accepted' : 'pending' as 'accepted' | 'pending',
    }));

    return staffWithStatus;
  },
});

/**
 * メールアドレス重複チェック
 * Convex側でのメール重複確認
 */
export const checkEmailAvailability = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    email: v.string(),
    exclude_staff_id: v.optional(v.id('staff')),
  },
  handler: async (ctx, args) => {

    const existingStaff = await ctx.db
      .query('staff')
      .withIndex('by_tenant_org_active_archive', (q) =>
        q.eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
      )
      .filter((q) => {
        const isNotArchived = q.eq(q.field('is_archive'), false);
        const hasEmail = q.eq(q.field('email'), args.email);
        
        // 除外するスタッフIDが指定されている場合
        if (args.exclude_staff_id) {
          return q.and(
            isNotArchived,
            hasEmail,
            q.neq(q.field('_id'), args.exclude_staff_id)
          );
        }
        
        return q.and(isNotArchived, hasEmail);
      })
      .first();
    
    console.log('🔍 メールアドレス重複チェック結果 1:', existingStaff)
    return {
      isAvailable: !existingStaff,
      existingStaff: existingStaff ? {
        id: existingStaff._id,
        name: existingStaff.name,
        email: existingStaff.email,
      } : null,
    };
  },
});

/**
 * スタッフ詳細取得（招待状態含む）
 */
export const getStaffWithInvitation = query({
  args: {
    staff_id: v.id('staff'),
  },
  handler: async (ctx, args) => {

    const staff = await ctx.db.get(args.staff_id);
    if (!staff || staff.is_archive) {
      return null;
    }

    // 関連データ取得
    const [staffAuth, staffConfig] = await Promise.all([
      ctx.db
        .query('staff_auth')
        .withIndex('by_tenant_org_staff_archive', (q) =>
          q.eq('tenant_id', staff.tenant_id)
           .eq('org_id', staff.org_id)
           .eq('staff_id', args.staff_id)
           .eq('is_archive', false)
        )
        .first(),
      ctx.db
        .query('staff_config')
        .withIndex('by_tenant_org_staff_archive', (q) =>
          q.eq('tenant_id', staff.tenant_id)
           .eq('org_id', staff.org_id)
           .eq('staff_id', args.staff_id)
           .eq('is_archive', false)
        )
        .first(),
    ]);

    return {
      ...staff,
      invitationStatus: staff.clerk_user_id ? 'accepted' : 'pending' as 'accepted' | 'pending',
      auth: staffAuth,
      config: staffConfig,
    };
  },
});