import { get } from './week_schedule/query'
import { query } from "@/convex/_generated/server";
import { checkAuth } from "@/convex/utils/auth";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from "@/lib/errors/constants";
import { validateStringLength } from "@/convex/utils/validations";
import { imageType } from "@/convex/types";

export const findByOrgId = query({
  args: {
    org_id: v.id('organization')
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true);
    return await ctx.db.get(args.org_id);
  },
});


export const findOrganizationByStripeConnectId = query({
  args: {
    stripe_account_id: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true);
    validateStringLength(args.stripe_account_id, 'stripe_account_id');

    return await ctx.db.query('organization').withIndex('by_stripe_account_archive', q => 
      q.eq('stripe_account_id', args.stripe_account_id)
      .eq('is_archive', false)
    )
    .first();
  },
});

export const getConnectAccountDetails = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization')
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true);
    validateStringLength(args.org_id, 'org_id');

    const organization = await ctx.db.get(args.org_id);
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
      stripe_account_id: organization.stripe_account_id,
      stripe_connect_status: organization.stripe_connect_status,
      stripe_connect_created_at: organization.stripe_connect_created_at,
    };

  },
});



export const getOrgAndConfig = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization')
  },
  handler: async (ctx, args) => {
    const organization = await ctx.db.get(args.org_id);
    if(!organization){
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'organization.query.getOrgAndConfig',
        message: '組織が見つかりません',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          ...args,
        },
      });
    }
    const config = await ctx.db.query('config')
      .withIndex('by_tenant_org_archive', q => 
        q.eq('tenant_id', args.tenant_id)
        .eq('org_id', args.org_id)
        .eq('is_archive', false)
      )
      .first();

    return {
      organization,
      config,
    };
  },
});