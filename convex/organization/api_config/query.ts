import { query } from '../../_generated/server';
import { v } from 'convex/values';
import { checkAuth } from '@/convex/utils/auth';
import { validateStringLength } from '@/convex/utils/validations';

export const getLiffId = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization')
  },
  handler: async (ctx, args) => {

    validateStringLength(args.org_id, 'org_id');
    
    const apiConfig = await ctx.db.query('api_config')
    .withIndex('by_tenant_org_archive', q => 
      q.eq('tenant_id', args.tenant_id)
       .eq('org_id', args.org_id)
       .eq('is_archive', false)
    )
    .first();
    if (!apiConfig) {
      return null
    }

    return apiConfig.liff_id
  },
})

export const findByTenantAndOrg = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization')
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateStringLength(args.org_id, 'org_id');
    return await ctx.db.query('api_config')
    .withIndex('by_tenant_org_archive', q => 
      q.eq('tenant_id', args.tenant_id)
       .eq('org_id', args.org_id)
       .eq('is_archive', false)
    )
    .first();
  },
});
