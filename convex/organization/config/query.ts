import { query } from '../../_generated/server';
import { ConvexError, v } from 'convex/values';
import { validateStringLength } from '@/convex/utils/validations';
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants';

export const findByTenantAndOrg = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization')
  },
  handler: async (ctx, args) => {
    validateStringLength(args.org_id, 'org_id');

    // 組織とconfigを並列で取得
    const [org, config] = await Promise.all([
      ctx.db.get(args.org_id),
      ctx.db.query('config')
        .withIndex('by_tenant_org_archive', q => 
          q.eq('tenant_id', args.tenant_id)
           .eq('org_id', args.org_id)
           .eq('is_archive', false)
        )
        .first()
    ]);
    
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

    return {
      org,
      config,
    };
  },
});
