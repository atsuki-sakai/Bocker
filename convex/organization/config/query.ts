import { query } from '../../_generated/server';
import { ConvexError, v } from 'convex/values';
import { checkAuth } from '@/convex/utils/auth';
import { validateStringLength } from '@/convex/utils/validations';
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants';

export const findByUserAndOrg = query({
  args: {
    user_id: v.string(),
    org_id: v.string(),
  },  
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateStringLength(args.org_id, 'org_id');
   
    const tenant = await ctx.db.query('tenant').withIndex('by_user_archive', q => 
      q.eq('user_id', args.user_id)
       .eq('is_archive', false)
    )
    .first();

    if (!tenant) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'findByUserAndOrg',
        message: 'tenant not found',
        code: 'CONFLICT',
        status: 409,
        details: {
          ...args,
        },
      });
    }

    return await ctx.db.query('config')
    .withIndex('by_tenant_org_archive', q => 
      q.eq('tenant_id', tenant._id)
       .eq('org_id', args.org_id)
       .eq('is_archive', false)
    )
  },
});

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
