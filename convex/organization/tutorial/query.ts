import { query } from "../../_generated/server";
import { v } from "convex/values";
import { checkAuth } from "@/convex/utils/auth";

export const checkTutorialStatus = query({
  args: {
    tenant_id: v.id("tenant"),
    org_id: v.id("organization"),
  },
  returns: v.object({
    tutorialEnd: v.optional(v.boolean()),
    completedSteps: v.array(v.number()),
    missingItems: v.array(v.string()),
    orgData: v.optional(v.object({
      org: v.object({
        org_name: v.string(),
      }),
      config: v.optional(v.object({
        address: v.optional(v.string()),
      })),
    })),
    weekSchedules: v.optional(v.array(v.any())),
    menus: v.optional(v.object({
      results: v.array(v.any()),
    })),
    staffList: v.optional(v.object({
      results: v.array(v.any()),
    })),
    reservationConfig: v.optional(v.any()),
    hasAnyStaffSchedule: v.optional(v.boolean()),
    apiConfig: v.optional(v.any()),
  }),
  handler: async (ctx, { tenant_id, org_id }) => {
    // 認証チェック
    await checkAuth(ctx);

    // 組織データ取得
    const organization = await ctx.db
      .query("organization")
      .withIndex("by_tenant_active_archive", (q) =>
        q.eq("tenant_id", tenant_id).eq("is_active", true).eq("is_archive", false)
      )
      .filter((q) => q.eq(q.field("_id"), org_id))
      .unique();

    if (!organization) {
      throw new Error("Organization not found");
    }

    // チュートリアル完了済みの場合は早期リターン
    if (organization.tutorial_end === true) {
      return {
        tutorialEnd: true,
        completedSteps: [1, 2, 3, 4, 5, 6],
        missingItems: [],
        orgData: undefined,
        weekSchedules: undefined,
        menus: undefined,
        staffList: undefined,
        reservationConfig: undefined,
        hasAnyStaffSchedule: undefined,
        apiConfig: undefined,
      };
    }

    // 並列でデータ取得
    const [
      config,
      weekSchedules,
      reservationConfig,
      apiConfig,
      menus,
      staffList,
      hasAnyStaffSchedule,
    ] = await Promise.all([
      // 1. 組織設定
      ctx.db
        .query("config")
        .withIndex("by_tenant_org_archive", (q) =>
          q.eq("tenant_id", tenant_id).eq("org_id", org_id).eq("is_archive", false)
        )
        .unique(),

      // 2. 営業時間
      ctx.db
        .query("week_schedule")
        .withIndex("by_tenant_org_archive", (q) =>
          q.eq("tenant_id", tenant_id).eq("org_id", org_id).eq("is_archive", false)
        )
        .collect(),

      // 3. 予約設定
      ctx.db
        .query("reservation_config")
        .withIndex("by_tenant_org_archive", (q) =>
          q.eq("tenant_id", tenant_id).eq("org_id", org_id).eq("is_archive", false)
        )
        .unique(),

      // 4. API設定
      ctx.db
        .query("api_config")
        .withIndex("by_tenant_org_archive", (q) =>
          q.eq("tenant_id", tenant_id).eq("org_id", org_id).eq("is_archive", false)
        )
        .unique(),

      // 5. メニュー一覧（最大100件）
      ctx.db
        .query("menu")
        .withIndex("by_tenant_org_active_archive", (q) =>
          q.eq("tenant_id", tenant_id).eq("org_id", org_id).eq("is_active", true).eq("is_archive", false)
        )
        .order("desc")
        .take(100),

      // 6. スタッフ一覧（最大100件）
      ctx.db
        .query("staff")
        .withIndex("by_tenant_org_active_archive", (q) =>
          q.eq("tenant_id", tenant_id).eq("org_id", org_id).eq("is_active", true).eq("is_archive", false)
        )
        .order("desc")
        .take(100),

      // 7. スタッフスケジュール有無チェック
      ctx.db
        .query("staff_week_schedule")
        .withIndex("by_tenant_org_staff_archive", (q) =>
          q.eq("tenant_id", tenant_id).eq("org_id", org_id)
        )
        .filter((q) => q.eq(q.field("is_archive"), false))
        .first()
        .then((result) => !!result),
    ]);

    // チュートリアル完了状態計算
    const completedSteps: number[] = [];
    const missingItems: string[] = [];

    // Step 1: 店舗基本情報
    if (organization.org_name && config?.address) {
      completedSteps.push(1);
    } else {
      missingItems.push("店舗情報の設定");
    }

    // Step 2: 営業時間
    if (weekSchedules && weekSchedules.length > 0) {
      completedSteps.push(2);
    } else {
      missingItems.push("営業時間の設定");
    }

    // Step 3: 予約設定
    if (reservationConfig) {
      completedSteps.push(3);
    } else {
      missingItems.push("予約設定の設定");
    }

    // Step 4: メニュー
    if (menus && menus.length > 0) {
      completedSteps.push(4);
    } else {
      missingItems.push("メニューの登録");
    }

    // Step 5: スタッフ
    if (staffList && staffList.length > 0) {
      completedSteps.push(5);
    } else {
      missingItems.push("スタッフの登録");
    }

    // Step 6: スタッフスケジュール
    if (hasAnyStaffSchedule === true) {
      completedSteps.push(6);
    } else {
      missingItems.push("スタッフスケジュールの設定");
    }

    return {
      tutorialEnd: false,
      completedSteps,
      missingItems,
      orgData: {
        org: {
          org_name: organization.org_name,
        },
        config: config ? {
          address: config.address,
        } : undefined,
      },
      weekSchedules,
      menus: {
        results: menus,
      },
      staffList: {
        results: staffList,
      },
      reservationConfig,
      hasAnyStaffSchedule,
      apiConfig,
    };
  },
});