
import { v } from "convex/values"   
import { mutation } from "@/convex/_generated/server";
import { validateRequired, validateStringLength } from "@/convex/utils/validations";
import { createRecord, updateRecord, killRecord } from "@/convex/utils/helpers";
import { ConvexError } from "convex/values";
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from "@/lib/errors/constants";
import { stripeConnectStatusType } from "@/convex/types";
import { imageType } from "@/convex/types";
import { MAX_NOTES_LENGTH, MAX_PHONE_LENGTH, MAX_POSTAL_CODE_LENGTH, MAX_ADDRESS_LENGTH } from "@/convex/constants";

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
    org_name: v.optional(v.string()),
    org_email: v.optional(v.string()),
    is_active: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {

    validateStringLength(args.org_name, 'org_name');
    validateStringLength(args.org_email, 'org_email');

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
    return await updateRecord(ctx, organization._id, {
      org_name: args.org_name,
      org_email: args.org_email,
      is_active: args.is_active ?? organization.is_active,
    });
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
        stripe_account_id: args.stripe_account_id,
        stripe_connect_status: 'pending',
        stripe_connect_created_at: new Date().getTime() * 1000,
      });
    }
  },
);


export const updateConnectStatus = mutation({
  args: {
    stripe_connect_status: stripeConnectStatusType,
    stripe_account_id: v.string(),
  },
  handler: async (ctx, args) => {
    validateRequired(args.stripe_connect_status, 'stripe_connect_status');
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

export const upsertOrgAndConfig = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    org_name: v.optional(v.string()),
    org_email: v.optional(v.string()),
    is_active: v.optional(v.boolean()),
    phone: v.optional(v.string()), // 電話番号
    postal_code: v.optional(v.string()), // 郵便番号
    address: v.optional(v.string()), // 住所
    reservation_rules: v.optional(v.string()), // 予約ルール
    description: v.optional(v.string()), // 店舗説明
  },
  handler: async (ctx, args) => {
    validateStringLength(args.org_name, 'org_name');
    validateStringLength(args.org_email, 'org_email');
    validateStringLength(args.phone, 'phone', MAX_PHONE_LENGTH);
    validateStringLength(args.postal_code, 'postal_code', MAX_POSTAL_CODE_LENGTH);
    validateStringLength(args.address, 'address', MAX_ADDRESS_LENGTH);
    validateStringLength(args.reservation_rules, 'reservation_rules', MAX_NOTES_LENGTH);

    const organization = await ctx.db.get(args.org_id);
    if(!organization){
      await createRecord(ctx, 'organization', {
        tenant_id: args.tenant_id,
        org_name: args.org_name ?? '',
        org_email: args.org_email ?? '',
        is_active: true
      });
    }else{
      await updateRecord(ctx, organization._id, {
        org_name: args.org_name ?? '',
        org_email: args.org_email ?? '',
        is_active: args.is_active ?? organization.is_active,
      });
    }

    const config = await ctx.db.query('config')
    .withIndex('by_tenant_org_archive', q => 
      q.eq('tenant_id', args.tenant_id)
      .eq('org_id', args.org_id)
      .eq('is_archive', false)
    )
    .first();
    if(!config){
      await createRecord(ctx, 'config', {
        tenant_id: args.tenant_id,
        org_id: args.org_id,
        phone: args.phone ?? '', // 電話番号
        postal_code: args.postal_code ?? '', // 郵便番号
        address: args.address ?? '', // 住所
        reservation_rules: args.reservation_rules ?? '', // 予約ルール
        images: [], // 画像
        description: args.description ?? '', // 店舗説明
      });
    }else{
      await updateRecord(ctx, config._id, {
        phone: args.phone ?? config.phone, // 電話番号
        postal_code: args.postal_code ?? config.postal_code, // 郵便番号
        address: args.address ?? config.address, // 住所
        reservation_rules: args.reservation_rules ?? config.reservation_rules, // 予約ルール
        description: args.description ?? config.description, // 店舗説明
      });
    }
    return true;
  },
});