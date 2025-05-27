import { mutation } from '../../_generated/server';
import { v } from 'convex/values';
import { checkAuth } from '@/convex/utils/auth';
import { validateRequired, validateStringLength } from '@/convex/utils/validations';
import { imageType } from '@/convex/types';
import { createRecord, updateRecord } from '@/convex/utils/helpers';
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants';
import { ConvexError } from 'convex/values';
import { MAX_NOTES_LENGTH, MAX_POSTAL_CODE_LENGTH, MAX_ADDRESS_LENGTH, MAX_PHONE_LENGTH } from '@/convex/constants';



export const create = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    phone: v.optional(v.string()), // 電話番号
    postal_code: v.optional(v.string()), // 郵便番号
    address: v.optional(v.string()), // 住所
    reservation_rules: v.optional(v.string()), // 予約ルール
    images: v.array(imageType), // 画像
    description: v.optional(v.string()), // 店舗説明
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true);
 
    validateRequired(args.org_id, 'org_id');
    validateStringLength(args.phone, 'phone', MAX_PHONE_LENGTH);
    validateStringLength(args.postal_code, 'postal_code', MAX_POSTAL_CODE_LENGTH);
    validateStringLength(args.address, 'address', MAX_ADDRESS_LENGTH);
    validateStringLength(args.reservation_rules, 'reservation_rules', MAX_NOTES_LENGTH);
    validateStringLength(args.description, 'description', MAX_NOTES_LENGTH);

    return await createRecord(ctx, 'config', {
      ...args,
      images: [],
    });
  },
});

export const updateImages = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    images: v.array(imageType),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.org_id, 'org_id');
    const config = await ctx.db.query('config').withIndex('by_tenant_org_archive', q => 
      q.eq('tenant_id', args.tenant_id)
       .eq('org_id', args.org_id)
       .eq('is_archive', false)
    )
    .first();

    if(!config) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'organization.config.updateImages',
        message: 'サロンの設定が見つかりませんでした。',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          ...args,
        },
      });
    
    }
    return await updateRecord(ctx, config._id, { images: args.images });
  },
})

export const upsert = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    org_name: v.optional(v.string()), // サロン名
    org_email: v.optional(v.string()), // メールアドレス
    phone: v.optional(v.string()), // 電話番号
    postal_code: v.optional(v.string()), // 郵便番号
    address: v.optional(v.string()), // 住所
    reservation_rules: v.optional(v.string()), // 予約ルール
    images: v.optional(v.array(imageType)),
    description: v.optional(v.string()), // 説明
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.org_id, 'org_id');
    validateStringLength(args.phone, 'phone', MAX_PHONE_LENGTH);
    validateStringLength(args.postal_code, 'postal_code', MAX_POSTAL_CODE_LENGTH);
    validateStringLength(args.address, 'address', MAX_ADDRESS_LENGTH);
    validateStringLength(args.reservation_rules, 'reservation_rules', MAX_NOTES_LENGTH);
    validateStringLength(args.description, 'description', MAX_NOTES_LENGTH);

    const existing = await ctx.db.query('config')
    .withIndex('by_tenant_org_archive', q => 
      q.eq('tenant_id', args.tenant_id)
       .eq('org_id', args.org_id)
       .eq('is_archive', false)
    )
    .first();
    if (existing) {
      return await updateRecord(ctx, existing._id, args);
    } else {
      return await createRecord(ctx, 'config', {
        ...args,
        org_id: args.org_id,
        phone: args.phone,
        postal_code: args.postal_code,
        address: args.address,
        reservation_rules: args.reservation_rules,
        images: [],
      });
    }
  },
});
