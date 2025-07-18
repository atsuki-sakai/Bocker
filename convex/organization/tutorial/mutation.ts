import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { checkAuth } from "@/convex/utils/auth";

export const completeTutorial = mutation({
  args: {
    tenant_id: v.id("tenant"),
    org_id: v.id("organization"),
  },
  returns: v.null(),
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

    // チュートリアル完了フラグを設定
    await ctx.db.patch(organization._id, {
      tutorial_end: true,
      updated_at: Date.now(),
    });
  },
});