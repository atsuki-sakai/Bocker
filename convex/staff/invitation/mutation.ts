import { v } from 'convex/values';
import { mutation } from '../../_generated/server';
import { genderType } from '../../types';
import { archiveRecord, updateRecord, createRecord } from '@/convex/utils/helpers';
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
    name: v.string(),
    email: v.string(),
    gender: genderType,
    age: v.optional(v.number()),
    instagram_link: v.optional(v.string()),
    description: v.optional(v.string()),
    tags: v.array(v.string()),
    // 事前設定情報
    extra_charge: v.optional(v.number()),
    priority: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
  
    // 注: メールアドレスの重複チェックはフロントエンドで実施済み
    
    // スタッフレコード作成（clerk_user_id = null で招待中を示す）
    const staffId = await createRecord(ctx, 'staff', {
      tenant_id: args.tenant_id,
      org_id: args.org_id,
      clerk_user_id: undefined, // 招待中のため null
      name: args.name,
      email: args.email,
      gender: args.gender,
      age: args.age,
      instagram_link: args.instagram_link,
      description: args.description,
      images: [],
      tags: args.tags,
      featured_hair_images: [],
      is_active: false, // 招待受諾まで非アクティブ
    });

    // 事前設定情報も保存（staff_configは招待受諾時に作成）
    // 返却値に含めて、API側で管理する
    return {
      staffId,
      preConfig: {
        extra_charge: args.extra_charge,
        priority: args.priority,
      }
    };
  },
});

/**
 * 招待受諾時の更新
 * clerk_user_idを設定
 * is_activeを有効化
 * staff_auth, staff_configテーブル作成
 */
export const acceptInvitation = mutation({
  args: {
    staff_id: v.id('staff'),
    clerk_user_id: v.string(),
    // 事前設定情報
    extra_charge: v.optional(v.number()),
    priority: v.optional(v.number()),
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

    // スタッフレコード更新
    await updateRecord(ctx, args.staff_id, {
      clerk_user_id: args.clerk_user_id,
      is_active: true,
    });

    // staff_auth作成
    await createRecord(ctx, 'staff_auth', {
      tenant_id: staff.tenant_id,
      org_id: staff.org_id,
      staff_id: args.staff_id,
      role: args.role || 'staff'
    });

    // staff_config作成
    await createRecord(ctx, 'staff_config', {
      tenant_id: staff.tenant_id,
      org_id: staff.org_id,
      staff_id: args.staff_id,
      extra_charge: args.extra_charge,
      priority: args.priority,
    });

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
    if (!staff || staff.is_archive) {
      throw new Error('スタッフが見つかりません');
    }

    // 既に受諾済みの場合はキャンセルできない
    if (staff.clerk_user_id) {
      throw new Error('既に受諾済みの招待はキャンセルできません');
    }

    // スタッフレコードを論理削除
    await archiveRecord(ctx, args.staff_id);

      return {
      success: true,
    };
  },
});