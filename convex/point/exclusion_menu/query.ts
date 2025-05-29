import { query } from '@/convex/_generated/server'
import { v } from 'convex/values'
import { checkAuth } from '@/convex/utils/auth'


export const list = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    point_config_id: v.id('point_config'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    const exclusionMenus = await ctx.db.query('point_exclusion_menu').withIndex('by_tenant_org_point_config_menu_archive', (q) => q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('point_config_id', args.point_config_id)).collect()
    return exclusionMenus
  },
})
