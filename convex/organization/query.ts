import { query } from "@/convex/_generated/server";
import { checkAuth } from "@/convex/utils/auth";
import { validateRequired } from "@/convex/utils/validations";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from "@/lib/errors/constants";
import { validateStringLength } from "@/convex/utils/validations";


export const findByTenantAndOrg = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true);
    validateRequired(args.org_id, 'org_id');
    return await ctx.db.query('organization').withIndex('by_tenant_org_archive', q => q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('is_archive', false)).first();
  },
});

export const findOrganizationByStripeConnectId = query({
  args: {
    stripe_connect_id: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true);
    validateStringLength(args.stripe_connect_id, 'stripe_connect_id');
    validateRequired(args.stripe_connect_id, 'stripe_connect_id');

    return await ctx.db.query('organization').withIndex('by_stripe_connect_archive', q => 
      q.eq('stripe_connect_id', args.stripe_connect_id)
      .eq('is_archive', false)
    )
    .first();
  },
});

export const getConnectAccountDetails = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true);
    validateStringLength(args.org_id, 'org_id');

    const organization = await ctx.db.query('organization').withIndex('by_tenant_org_archive', (q) => q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('is_archive', false)).first();
    if (!organization) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'organization.stripe_connect.getConnectAccountDetails',
        message: '組織のStripe Connect情報が見つかりません',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          ...args,
        },
      });
    }
    return {
      stripe_connect_id: organization.stripe_connect_id,
      stripe_connect_status: organization.stripe_connect_status,
      stripe_connect_created_at: organization.stripe_connect_created_at,
    };

  },
});