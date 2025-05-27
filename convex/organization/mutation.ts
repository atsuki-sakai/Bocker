
import { v } from "convex/values"   
import { mutation } from "@/convex/_generated/server";
import { validateRequired, validateStringLength } from "@/convex/utils/validations";
import { createRecord, updateRecord, killRecord } from "@/convex/utils/helpers";
import { ConvexError } from "convex/values";
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from "@/lib/errors/constants";
import { stripeConnectStatusType } from "@/convex/types";

export const create = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_name: v.string(),
    org_email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    validateStringLength(args.org_name, 'org_name');
    validateStringLength(args.org_email, 'org_email');
    const tenant = await ctx.db.get(args.tenant_id);
    if(!tenant){
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'organization.mutation.create',
        message: 'テナントが見つかりません',
      });
    }
    return await createRecord(ctx, 'organization', {
      ...args,
      is_active: true
    });
  },
});

export const update = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    is_active: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {



    const organization = await ctx.db.get(args.org_id);
    if(!organization){
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'organization.mutation.update',
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

export const createConnectAccount = mutation({
    args: {
      tenant_id: v.id('tenant'),
      org_id: v.id('organization'),
      stripe_account_id: v.string(),
    },
    handler: async (ctx, args) => {

      validateRequired(args.org_id, 'org_id');
      validateStringLength(args.stripe_account_id, 'stripe_account_id');
  
      // 組織を取得
      const organization = await ctx.db.get(args.org_id);
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

      return await updateRecord(ctx, organization._id, {
        ...args,
        stripe_account_id: args.stripe_account_id,
        stripe_connect_status: 'pending',
        stripe_connect_created_at: new Date().getTime() * 1000,
      });
    }
  },
);


export const updateConnectStatus = mutation({
  args: {
    status: stripeConnectStatusType,
    stripe_account_id: v.string(),
  },
  handler: async (ctx, args) => {
    validateRequired(args.status, 'status');
    validateRequired(args.stripe_account_id, 'stripe_account_id');

    const organization = await ctx.db.query('organization')
    .withIndex('by_stripe_account_archive', q => 
      q.eq('stripe_account_id', args.stripe_account_id)
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
          stripe_account_id: args.stripe_account_id,
        },
      });
    }

    return await updateRecord(ctx, organization._id, args);
  },
});


export const kill = mutation({
  args: {
    org_id: v.id('organization')
  },
  handler: async (ctx, args) => {
    validateRequired(args.org_id, 'org_id');
    const organization = await ctx.db.get(args.org_id);
    if(!organization){
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'organization.mutation.kill',
        message: '組織が見つかりません',
      });
    }
    return await killRecord(ctx, organization._id);
  },
});