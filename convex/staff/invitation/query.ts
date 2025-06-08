import { v } from 'convex/values';
import { query } from '../../_generated/server';
import { InvitationStatus } from '@/convex/types';

/**
 * 招待中スタッフ一覧
 * connect_clerk が trueで clerk_user_id が null のスタッフを取得
 * staff_invitationテーブルから招待情報も取得
 */
export const listPending = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
  },
  handler: async (ctx, args) => {

    // 招待中スタッフのリストを取得
    const pendingStaff = await ctx.db
      .query('staff')
      .withIndex('by_tenant_org_active_archive', (q) =>
        q.eq('tenant_id', args.tenant_id)
         .eq('org_id', args.org_id)
         .eq('is_active', false) // 招待中は非アクティブ
         .eq('is_archive', false)
      )
      .filter((q) => q.eq(q.field('connect_clerk'), true) && q.eq(q.field('clerk_user_id'), undefined))
      .collect();

    // 各スタッフの招待情報を取得
    const staffWithInvitation = await Promise.all(
      pendingStaff.map(async (staff) => {
        const config = await ctx.db.query('staff_config').withIndex('by_tenant_org_staff_archive', (q) =>
          q.eq('tenant_id', args.tenant_id)
           .eq('org_id', args.org_id)
           .eq('staff_id', staff._id)
           .eq('is_archive', false)
        ).first();

        const invitation = await ctx.db
          .query('staff_invitation')
          .withIndex('by_tenant_org_staff_archive', (q) =>
            q.eq('tenant_id', args.tenant_id)
             .eq('org_id', args.org_id)
             .eq('staff_id', staff._id)
             .eq('is_archive', false)
          )
          .first();

        return {
          ...staff,
          config: config,
          clerk_invitation_id: invitation?.invitation_id || null,
          invitation_email: invitation?.invitation_email || null,
          invitation_status: invitation?.invitation_status || 'pending',
        };
      })
    );

    return staffWithInvitation;
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
    const staffConfig = await ctx.db
        .query('staff_config')
        .withIndex('by_tenant_org_staff_archive', (q) =>
          q.eq('tenant_id', staff.tenant_id)
           .eq('org_id', staff.org_id)
           .eq('staff_id', args.staff_id)
           .eq('is_archive', false)
        )
        .first()

    // 招待情報を取得
    const invitation = await ctx.db
      .query('staff_invitation')
      .withIndex('by_tenant_org_staff_archive', (q) =>
        q.eq('tenant_id', staff.tenant_id)
         .eq('org_id', staff.org_id)
         .eq('staff_id', args.staff_id)
         .eq('is_archive', false)
      )
      .first();

    return {
      ...staff,
      invitationStatus: staff.clerk_user_id ? 'accepted' : 'pending' as InvitationStatus,
      config: staffConfig,
      clerk_invitation_id: invitation?.invitation_id || null,
      invitation_email: invitation?.invitation_email || null,
      invitation_status: invitation?.invitation_status || null,
    };
  },
});

/**
 * 完全なスタッフデータ取得（一時的な情報含む）
 * 再送処理で使用
 */
export const getCompleteStaffData = query({
  args: {
    staff_id: v.id('staff'),
  },
  handler: async (ctx, args) => {

    const staff = await ctx.db.get(args.staff_id);
    if (!staff || staff.is_archive) {
      return null;
    }

    // 関連データ取得
    const staffConfig = await ctx.db
        .query('staff_config')
        .withIndex('by_tenant_org_staff_archive', (q) =>
          q.eq('tenant_id', staff.tenant_id)
           .eq('org_id', staff.org_id)
           .eq('staff_id', args.staff_id)
           .eq('is_archive', false)
        )
        .first()

    return {
      ...staff,
      invitationStatus: staff.clerk_user_id ? 'accepted' : 'pending' as InvitationStatus,
      config: staffConfig,
    };
  },
});