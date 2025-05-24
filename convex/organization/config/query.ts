import { query } from '../../_generated/server';
import { ConvexError, v } from 'convex/values';
import { checkAuth } from '@/convex/utils/auth';
import { validateStringLength } from '@/convex/utils/validations';

export const findByTenantAndOrg = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateStringLength(args.org_id, 'org_id');
    return await ctx.db.query('config')
    .withIndex('by_tenant_org_archive', q => 
      q.eq('tenant_id', args.tenant_id)
       .eq('org_id', args.org_id)
       .eq('is_archive', false)
    )
    .first();
  },
});
