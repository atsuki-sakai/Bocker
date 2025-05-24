import { v } from "convex/values"   
import { mutation } from "@/convex/_generated/server";
import { validateRequired, validateStringLength } from "@/convex/utils/validations";
import { createRecord, updateRecord } from "@/convex/utils/helpers";
import { ConvexError } from "convex/values";
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from "@/lib/errors/constants";


export const createConnectAccount = mutation({
    args: {
      tenant_id: v.id('tenant'),
      org_id: v.string(),
      stripe_connect_id: v.string(),
      status: v.string(),
      user_id: v.string(),
      org_name: v.string(),
      org_email: v.string(),
    },
    handler: async (ctx, args) => {

      validateRequired(args.org_id, 'org_id');
      validateStringLength(args.stripe_connect_id, 'stripe_connect_id');
      validateStringLength(args.status, 'status');
      validateStringLength(args.user_id, 'user_id');
      validateStringLength(args.org_name, 'org_name');
      validateStringLength(args.org_email, 'org_email');
  
      // 組織を取得
      const organization = await ctx.db.query('organization')
      .withIndex('by_tenant_org_archive', q => 
        q.eq('tenant_id', args.tenant_id)
        .eq('org_id', args.org_id)
        .eq('is_archive', false)
      )
      .first();

      if (!organization) {
        throw new ConvexError({
          statusCode: ERROR_STATUS_CODE.NOT_FOUND,
          severity: ERROR_SEVERITY.ERROR,
          callFunc: 'organization.stripe_connect.createConnectAccount',
          message: '組織が見つかりません',
          code: 'NOT_FOUND',
          status: 404,
          details: {
            tenant_id: args.tenant_id,
            org_id: args.org_id,
          },
        });
      }

      return await createRecord(ctx, 'organization', args);
    }
  },
);


export const updateConnectStatus = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.string(),
    status: v.string(),
    stripe_connect_id: v.string(),
  },
  handler: async (ctx, args) => {
   
    validateRequired(args.org_id, 'org_id');
    validateRequired(args.status, 'status');
    validateRequired(args.stripe_connect_id, 'stripe_connect_id');

    const organization = await ctx.db.query('organization')
    .withIndex('by_tenant_org_archive', q => 
      q.eq('tenant_id', args.tenant_id)
      .eq('org_id', args.org_id)
      .eq('is_archive', false)
    )
    .first();

    if (!organization) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'organization.stripe_connect.updateConnectStatus',
        message: '組織が見つかりません',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          tenant_id: args.tenant_id,
          org_id: args.org_id,
        },
      });
    }

    return await updateRecord(ctx, organization._id, args);
  },
});

