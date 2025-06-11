import { query } from '../../_generated/server';
import { ConvexError, v } from 'convex/values';
import { checkAuth } from '@/convex/utils/auth';
import { validateStringLength } from '@/convex/utils/validations';
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants';

export const findByTenantAndOrg = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization')
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateStringLength(args.org_id, 'org_id');

    const org = await ctx.db.get(args.org_id);
    if (!org) {
      throw new ConvexError({
        message: '指定された組織が存在しません',
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'organization.config.query.findByTenantAndOrg',
        code: 'NOT_FOUND',
        status: ERROR_STATUS_CODE.NOT_FOUND,
        details: { ...args },
      })
    }

    const config = await ctx.db.query('config')
    .withIndex('by_tenant_org_archive', q => 
      q.eq('tenant_id', args.tenant_id)
       .eq('org_id', args.org_id)
       .eq('is_archive', false)
    )
    .first();

    return {
      org,
      config,
    };
  },
});
