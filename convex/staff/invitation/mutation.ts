import { v } from 'convex/values';
import { mutation } from '../../_generated/server';
import { archiveRecord, updateRecord, createRecord, killRecord } from '@/convex/utils/helpers';
import { roleType } from '@/convex/types';

/**
 * 招待付きスタッフ作成
 * スタッフレコードを作成（clerk_user_id = null）
 * 基本情報設定、事前設定情報を保存
 */
export const createWithInvitation = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    email: v.string(),
  },
  handler: async (ctx, args) => {
  
    // 注: メールアドレスの重複チェックはフロントエンドで実施済み
    
    // スタッフレコード作成（clerk_user_id = null で招待中を示す）
    const staffId = await createRecord(ctx, 'staff', {
      tenant_id: args.tenant_id,
      org_id: args.org_id,
      connect_clerk: true,
      clerk_user_id: undefined, // 招待中のため null
      name: '未設定', // 招待受諾後に設定
      description: undefined,
      images: [],
      is_active: false, // 招待受諾まで非アクティブ
    });

    // staff_configは招待受諾後に作成するため、ここでは作成しない

    return {
      staffId,
    };
  },
});

/**
 * 招待受諾時の更新
 * clerk_user_idを設定
 * is_activeを有効化
 * staff_configテーブル作成
 */
export const acceptInvitation = mutation({
  args: {
    staff_id: v.id('staff'),
    clerk_user_id: v.string(),
    role: v.optional(roleType),
  },
  handler: async (ctx, args) => {

    // スタッフレコード取得
    const staff = await ctx.db.get(args.staff_id);
    if (!staff || staff.is_archive) {
      throw new Error('スタッフが見つかりません');
    }

    if (staff.clerk_user_id) {
      throw new Error('既に受諾済みの招待です');
    }

    // スタッフレコード更新（一時的なデータもクリア）
    await updateRecord(ctx, args.staff_id, {
      clerk_user_id: args.clerk_user_id,
      is_active: true,
    });
    
    // staff_invitationレコードを更新
    const invitation = await ctx.db
      .query('staff_invitation')
      .withIndex('by_tenant_org_staff_archive', (q) =>
        q.eq('tenant_id', staff.tenant_id)
         .eq('org_id', staff.org_id)
         .eq('staff_id', args.staff_id)
         .eq('is_archive', false)
      )
      .first();
      
    if (invitation) {
      await updateRecord(ctx, invitation._id, {
        invitation_status: 'accepted' as const,
      });
      // 受諾完了後、招待レコードをアーカイブ
      await killRecord(ctx, invitation._id);
    }

    // staff_configが既に存在するか確認
    const existingConfig = await ctx.db
      .query('staff_config')
      .withIndex('by_tenant_org_staff_archive', (q) => 
        q.eq('tenant_id', staff.tenant_id)
         .eq('org_id', staff.org_id)
         .eq('staff_id', args.staff_id)
         .eq('is_archive', false)
      )
      .first();

    if (!existingConfig) {
      // staff_config作成（初期値のみ設定）
      await createRecord(ctx, 'staff_config', {
        tenant_id: staff.tenant_id,
        org_id: staff.org_id,
        staff_id: args.staff_id,
        role: args.role || 'staff',
        tags: [],
        featured_hair_images: [],
        gender: 'unselected',
      });
    }

    // 週次スケジュールの初期化（全曜日休み）
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
    
    for (const day of daysOfWeek) {
      await createRecord(ctx, 'staff_week_schedule', {
        tenant_id: staff.tenant_id,
        org_id: staff.org_id,
        staff_id: args.staff_id,
        is_open: false,
        day_of_week: day
      });
    }

    return {
      success: true,
      staffId: args.staff_id,
    };
  },
});

/**
 * 招待キャンセル
 * staffレコードの削除
 * 関連データのクリーンアップ
 */
export const cancelInvitation = mutation({
  args: {
    staff_id: v.id('staff'),
  },
  handler: async (ctx, args) => {
    const staff = await ctx.db.get(args.staff_id);
    if (!staff) {
      throw new Error('スタッフが見つかりません');
    }

    // 既にアーカイブ済みの場合は成功として扱う
    if (staff.is_archive) {
      return {
        success: true,
        message: 'スタッフは既に削除済みです',
      };
    }

    // 既に受諾済みの場合はキャンセルできない
    if (staff.clerk_user_id) {
      throw new Error('既に受諾済みの招待はキャンセルできません');
    }

    // スタッフレコードを論理削除
    await killRecord(ctx, args.staff_id);
    
    // 関連するstaff_invitationレコードもアーカイブ
    const invitation = await ctx.db
      .query('staff_invitation')
      .withIndex('by_tenant_org_staff_archive', (q) =>
        q.eq('tenant_id', staff.tenant_id)
         .eq('org_id', staff.org_id)
         .eq('staff_id', args.staff_id)
         .eq('is_archive', false)
      )
      .first();
      
    if (invitation) {
      await killRecord(ctx, invitation._id);
    }

    return {
      success: true,
    };
  },
});