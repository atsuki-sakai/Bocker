import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { validateRequired } from '@/convex/utils/validations';
import { checkAuth } from '@/convex/utils/auth';

//スタッフIDからスタッフ設定を取得
export const findByStaffId = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    staff_id: v.id('staff'),
    include_archive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.staff_id, 'staff_id');
    return await ctx.db
      .query('staff_config')
      .withIndex('by_tenant_org_staff_archive', (q) =>
        q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('staff_id', args.staff_id).eq('is_archive', args.include_archive || false)
      )
      .first();
  },
});
